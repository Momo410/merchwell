import type { getCart } from "./cart";
import type { PricedQuote } from "./pricing";
import type { QuoteMeta } from "./quote-design";
import { adminQuery, getAdminToken } from "./shopify-admin";

type Cart = NonNullable<Awaited<ReturnType<typeof getCart>>>;

const CREATE_DRAFT_ORDER = `#graphql
  mutation QuoteDraftOrder($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder { id invoiceUrl name totalPriceSet { shopMoney { amount currencyCode } } }
      userErrors { field message }
    }
  }`;

interface DraftOrderResult {
  draftOrderCreate: {
    draftOrder: {
      id: string;
      invoiceUrl: string;
      name: string;
      totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
    } | null;
    userErrors: { field: string[] | null; message: string }[];
  };
}

const amount = (cents: number, currencyCode: string) => ({
  amount: (cents / 100).toFixed(2),
  currencyCode,
});

// A Shopify draft order at the quote's own prices, so the pay link charges what the quote says, not the cart's list prices.
export async function createQuoteCheckout(input: {
  cart: Cart;
  discountPercent: number;
  email: string;
  meta: QuoteMeta;
  quote: PricedQuote;
}) {
  const { cart, discountPercent, email, meta, quote } = input;
  const token = await getAdminToken();
  if (!token) throw new Error("The Shopify Admin API is not configured.");
  const currency = meta.currency;
  const unitByHandle = new Map(quote.products.map((p) => [p.handle, p.unitCents]));
  const lineItems: object[] = cart.lines.nodes.map((node) => {
    const unitCents = unitByHandle.get(node.merchandise.product.handle);
    if (unitCents === undefined)
      throw new Error(`The quote has no price for ${node.merchandise.product.title}.`);
    return {
      priceOverride: amount(unitCents, currency),
      quantity: node.quantity,
      variantId: node.merchandise.id,
    };
  });
  for (const product of quote.products.filter((p) => p.setupCents > 0))
    lineItems.push({
      originalUnitPriceWithCurrency: amount(product.setupCents, currency),
      quantity: 1,
      requiresShipping: false,
      title: `Logo setup, one time: ${product.title}`,
    });
  if (quote.rush)
    lineItems.push({
      originalUnitPriceWithCurrency: amount(quote.rush, currency),
      quantity: 1,
      requiresShipping: false,
      title: `Rush production (${quote.productionDays} business days)`,
    });
  const { draftOrderCreate } = await adminQuery<DraftOrderResult>(token, CREATE_DRAFT_ORDER, {
    input: {
      ...(discountPercent
        ? {
            appliedDiscount: {
              title: `${discountPercent}% quote reward`,
              value: discountPercent,
              valueType: "PERCENTAGE",
            },
          }
        : {}),
      email,
      lineItems,
      note: `Quote ${meta.number}${meta.pageUrl ? `: ${meta.pageUrl}` : ""}`,
      ...(meta.shippingAtCheckout
        ? {}
        : {
            shippingLine: {
              priceWithCurrency: amount(quote.shipping, currency),
              title: quote.shipping ? "Standard shipping" : "Free shipping",
            },
          }),
      tags: ["merch-quote", meta.number],
    },
  });
  const draft = draftOrderCreate.draftOrder;
  if (!draft) throw new Error(draftOrderCreate.userErrors.map((e) => e.message).join("; "));
  return {
    id: draft.id,
    name: draft.name,
    payUrl: draft.invoiceUrl,
    total: new Intl.NumberFormat("en-US", {
      currency: draft.totalPriceSet.shopMoney.currencyCode,
      style: "currency",
    }).format(Number(draft.totalPriceSet.shopMoney.amount)),
  };
}
