import { readFileSync } from "node:fs";
import { join } from "node:path";

import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";

import { getCart, getSessionCartId, mutateCart } from "../lib/cart";
import { checkSendLimit, LEAD_CODE, logSend, saveLeadCustomer, sendQuoteEmail } from "../lib/leads";
import { currentQuote } from "../lib/quote";
import { createQuoteCheckout } from "../lib/quote-checkout";
import { renderQuoteEmail } from "../lib/render-quote";
import { sendLeadAlert } from "../lib/telegram";

const money = (amount: string, currency: string) =>
  new Intl.NumberFormat("en-US", { currency, style: "currency" }).format(Number(amount));

export default defineTool({
  // The shopper confirms the details the model passes, so a misheard email never becomes a lead.
  approval: {
    prompt: ({ input }) =>
      `Send the quote to ${input.name}, ${input.email}${input.phone ? `, ${input.phone}` : ""}?`,
    request: always(),
  },
  description:
    "Email the shopper's current quote (PDF attached) after they give their name and email, save them as a store lead, alert the owner, and return a pay link that charges exactly the quote (10% off at 24+ pieces). Call it only with contact details the shopper typed in this conversation, after make-quote, and only once they agree.",
  inputSchema: z.strictObject({
    email: z.email().max(254).describe("The shopper's email address, exactly as they typed it"),
    name: z.string().trim().min(1).max(80).describe("The shopper's name as they gave it"),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()-]{6,20}$/)
      .optional()
      .describe("Phone or WhatsApp number, only if the shopper offered one"),
  }),
  async execute({ email, name, phone }, ctx) {
    const cartId = getSessionCartId(ctx);
    const cart = await getCart(cartId);
    if (!cart || !cartId)
      return { ok: false as const, message: "Cart is unavailable. Refresh the storefront." };
    const quote = currentQuote(cart, cartId);
    if (!quote)
      return {
        ok: false as const,
        message: "No current quote matches the cart. Call make-quote first, then send it.",
      };
    const limit = checkSendLimit(cartId, email, quote.meta.number);
    if (limit) return { ok: false as const, message: limit };

    const lead = { email, name, phone };
    const customer = await saveLeadCustomer(
      lead,
      `Quote ${quote.meta.number}: ${quote.order}, ${quote.total}. ${quote.meta.pageUrl ?? ""}\nConsent: quote email only.`,
    ).catch((error: Error) => ({ ok: false as const, reason: error.message }));
    if (!customer.ok) console.error(`[leads] Shopify customer not saved: ${customer.reason}`);

    const percent = quote.quote.pieces >= LEAD_CODE.minPieces ? LEAD_CODE.percent : 0;
    const checkout = await createQuoteCheckout({
      cart,
      discountPercent: percent,
      email,
      meta: quote.meta,
      quote: quote.quote,
    }).catch((error: Error) => {
      console.error(`[leads] Draft order not created: ${error.message}`);
      return null;
    });

    // Without a draft order the cart checkout is the fallback; Shopify decides whether the code applies there.
    let offer: { code: string; payUrl: string; percent: number } | null = null;
    let checkoutTotal: string | undefined;
    if (checkout && percent) {
      offer = { code: LEAD_CODE.code, payUrl: checkout.payUrl, percent };
      checkoutTotal = checkout.total;
    } else if (!checkout && percent) {
      const hasCode = cart.discountCodes.some((d) => d.code.toUpperCase() === LEAD_CODE.code);
      const change = hasCode
        ? null
        : await mutateCart(cartId, {
            discountCodes: [...cart.discountCodes.map((d) => d.code), LEAD_CODE.code],
          });
      const updated = change && "error" in change ? null : await getCart(cartId);
      if (
        updated?.discountCodes.some((d) => d.code.toUpperCase() === LEAD_CODE.code && d.applicable)
      ) {
        offer = { code: LEAD_CODE.code, payUrl: updated.checkoutUrl, percent: LEAD_CODE.percent };
        checkoutTotal = money(
          updated.cost.totalAmount.amount,
          updated.cost.totalAmount.currencyCode,
        );
      }
    }

    const rendered = await renderQuoteEmail(quote.quote, { ...quote.meta, offer });
    const sent = await sendQuoteEmail({
      ...rendered,
      pdf: readFileSync(join(quote.dir, "quote.pdf")),
      pdfName: `${quote.meta.number}.pdf`,
      replyTo: quote.meta.shopEmail,
      subject: `Your ${quote.meta.shopName} quote ${quote.meta.number}${offer ? `: ${offer.percent}% off inside` : ""}`,
      to: email,
    }).catch((error: Error) => ({ ok: false as const, reason: error.message, skipped: false }));

    const alert = await sendLeadAlert({
      ...(offer ? { code: offer.code, discounted: `${checkoutTotal} to pay` } : {}),
      email,
      name,
      order: quote.order,
      ...(phone ? { phone } : {}),
      // Telegram rejects buttons that point at localhost.
      ...(quote.meta.pageUrl?.startsWith("https://") ? { quoteUrl: quote.meta.pageUrl } : {}),
      total: quote.total,
    }).catch((error: Error) => ({ ok: false, reason: error.message }));
    if (!alert.ok)
      console.error(`[leads] Telegram alert failed: ${"reason" in alert ? alert.reason : ""}`);

    logSend(cartId, email, quote.meta.number);
    return {
      ok: true as const,
      discount: offer
        ? { appliedToCart: !checkout, code: offer.code, percent: offer.percent }
        : {
            appliedToCart: false,
            reason:
              quote.quote.pieces < LEAD_CODE.minPieces
                ? `The ${LEAD_CODE.percent}% code needs ${LEAD_CODE.minPieces}+ pieces.`
                : "Shopify did not accept the code for this cart.",
          },
      email: sent.ok
        ? "sent"
        : sent.skipped
          ? "not sent: email is not set up yet; the owner has the details and follows up"
          : "failed: the owner has the details and follows up",
      ownerNotified: alert.ok,
      payLink: checkout ? { total: checkout.total, url: checkout.payUrl } : null,
      quoteNumber: quote.meta.number,
      savedAsLead: customer.ok,
    };
  },
  label: {
    complete: (_input, output) =>
      output.ok
        ? output.email === "sent"
          ? `Quote ${output.quoteNumber} emailed`
          : `Lead saved for quote ${output.quoteNumber}`
        : "Quote not sent",
    start: () => "Send quote by email",
  },
});
