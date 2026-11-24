import { defineTool } from "eve/tools";
import { z } from "zod";

import { toAgentProductDetails } from "../../lib/agent/products";
import { fetchProductWithVariants } from "../../lib/shopify/operations/products/server";
import { productHandleSchema, toModelProductDetails } from "../lib/catalog";
import { fetchMerchPricing } from "../lib/shopify-admin";

const dollars = (cents: number) =>
  new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" }).format(cents / 100);

// The same price ladder make-quote uses, so "how much at 100?" gets a real answer.
async function merchPricing(productId: string) {
  const merch = (await fetchMerchPricing([productId]).catch(() => null))?.get(productId);
  if (!merch?.breaks?.length) return null;
  return {
    pricePerPieceByQuantity: [...merch.breaks]
      .sort((a, b) => a.min - b.min)
      .map((tier) => ({ fromPieces: tier.min, pricePerPiece: dollars(tier.unitCents) })),
    ...(merch.decoration
      ? {
          logoSetup: "Free, included in every order",
          decoration: merch.decoration.method,
        }
      : {}),
  };
}

export default defineTool({
  description:
    "Get details for a specific product, such as its description, options, variant availability when the variant list is complete, and its price per piece at each quantity (the price breaks); logo setup is free.",
  inputSchema: z.strictObject({
    handle: productHandleSchema,
    showOptions: z
      .boolean()
      .default(false)
      .describe(
        "Show the shopper this product's option picker. Only when they want to choose options themselves, not to answer a question or before adding a variant you chose.",
      ),
  }),
  execute: async ({ handle }) => {
    const product = await fetchProductWithVariants({ handle });
    if (!product) return { error: "Product not found." };
    const details = toAgentProductDetails(product);
    return { pricing: await merchPricing(product.id), product: details };
  },
  toModelOutput: (output) => {
    const base = toModelProductDetails(output);
    if (!("pricing" in output) || !output.pricing || base.type !== "json") return base;
    return { type: "json", value: { ...(base.value as object), pricing: output.pricing } };
  },
});
