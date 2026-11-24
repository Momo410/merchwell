import { defineTool } from "eve/tools";
import { z } from "zod";

import { toAgentProduct } from "../../lib/agent/products";
import type { SortValue } from "../../lib/collections/types";
import { fetchCollections } from "../../lib/shopify/operations/collections/server";
import { fetchCollectionProducts } from "../../lib/shopify/operations/products/server";
import { productHandleSchema, toModelProducts } from "../lib/catalog";

export default defineTool({
  description:
    "List this store's collections, or browse the products in one collection by its handle. The shopper does not see these results: pick the products that match the request and show them with present-products.",
  inputSchema: z.strictObject({
    collection: productHandleSchema
      .optional()
      .describe("A collection handle from an earlier listing or page context. Omit to list them."),
    sortKey: z
      .enum([
        "manual",
        "best-selling",
        "created-descending",
        "price-ascending",
        "price-descending",
      ] as const satisfies readonly SortValue[])
      .default("manual"),
  }),
  execute: async ({ collection, sortKey }) => {
    if (!collection)
      return {
        collections: (await fetchCollections()).map(({ description, handle, title }) => ({
          description: description.slice(0, 160),
          handle,
          title,
        })),
      };
    const { products } = await fetchCollectionProducts({ collection, limit: 12, sortKey });
    if (!products.length)
      return { error: "No products found for this collection handle. List collections first." };
    return {
      products: products.map((product) => ({ ...toAgentProduct(product), id: product.id })),
    };
  },
  // Without each product's ID the agent guessed IDs for present-products and no cards appeared.
  toModelOutput: (output) => {
    const { products } = output;
    if (!products) return { type: "json", value: output };
    const base = toModelProducts({ products });
    if (base.type !== "json") return base;
    const ids = new Map(products.map((product) => [product.handle, product.id]));
    const value = base.value as { products: { handle: string }[] };
    return {
      type: "json",
      value: { products: value.products.map((p) => ({ id: ids.get(p.handle), ...p })) },
    };
  },
});
