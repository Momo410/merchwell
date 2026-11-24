import { defineTool } from "eve/tools";
import { z } from "zod";

import { getCart, getSessionCartId } from "../lib/cart";
import { writeQuote } from "../lib/quote";

export default defineTool({
  description:
    "Turn the shopper's Shopify cart into a merch quote built with Hyper Elements: a web page, an email, a PDF and a share card. Prices come from the store's price breaks and live stock is checked, so never pass amounts. Prices lock for 14 days. Calling it again after the cart changes makes a new version that replaces the old one; an unchanged cart returns the same quote. Returns same-site links to share as Markdown links.",
  inputSchema: z.strictObject({
    preparedFor: z
      .string()
      .max(120)
      .optional()
      .describe("Name or company the shopper wants on the quote, only if they gave one"),
    project: z
      .string()
      .max(120)
      .optional()
      .describe("What the merch is for, in the shopper's words, e.g. 'Team offsite in Austin'"),
    requests: z
      .array(z.string().min(3).max(200))
      .max(5)
      .default([])
      .describe(
        "Custom asks only the owner can approve, in the shopper's words: discounts, price matches, substitutions, special decoration. Never grant them yourself; listing them marks the quote NEEDS REVIEW.",
      ),
    rush: z
      .boolean()
      .default(false)
      .describe(
        "True only when the shopper needs it faster than standard production and accepts the rush fee",
      ),
  }),
  async execute({ preparedFor, project, requests, rush }, ctx) {
    const cartId = getSessionCartId(ctx);
    const cart = await getCart(cartId);
    if (!cart || !cartId)
      return { ok: false as const, message: "Cart is unavailable. Refresh the storefront." };
    if (!cart.lines.nodes.length)
      return { ok: false as const, message: "The cart is empty, so there is nothing to quote." };
    return {
      ok: true as const,
      ...(await writeQuote({ cart, cartId, preparedFor, project, requests, rush })),
    };
  },
  // Declared after execute so TypeScript infers `output` from its return type.
  label: {
    complete: (_input, output) =>
      output.ok
        ? `Quote ${output.quoteNumber}${output.unchanged ? " (unchanged)" : ""} ready`
        : "No quote created",
    start: () => "Create quote from cart",
  },
});
