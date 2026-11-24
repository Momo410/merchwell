import type { ToolStub } from "eve/evals";

const COLORS = ["Off White", "Black", "Heather Grey"];
const SIZES = ["S", "M", "L", "XL", "XXL"];

// The real Heavyweight Hoodie as search-products returns it, frozen so stock changes can't move the eval.
export const HOODIE = {
  available: true,
  collections: ["merch", "apparel"],
  compareAtPrice: null,
  handle: "heavyweight-hoodie",
  id: "gid://shopify/Product/10881846083878",
  options: [
    { name: "Color", values: COLORS },
    { name: "Size", values: SIZES },
  ],
  price: "$68.00",
  title: "Heavyweight Hoodie",
  variants: COLORS.flatMap((color) =>
    SIZES.map((size) => ({ available: true, options: `${color} / ${size}` })),
  ),
};

// Every search, including the includeUnavailable retry, finds hoodies but never navy.
export const noNavyStubs = [
  {
    id: "search",
    outcome: { response: { messages: [], nextCursor: null, products: [HOODIE] } },
    tool: "search-products",
  },
] satisfies readonly ToolStub[];

// Search and the collection fallback both fail, so the agent has no catalog to answer from.
export const catalogDownStubs = [
  {
    id: "search",
    outcome: { response: { error: "Catalog search is unavailable." } },
    tool: "search-products",
  },
  {
    id: "browse",
    outcome: { response: { error: "Collections are unavailable." } },
    tool: "browse-collections",
  },
] satisfies readonly ToolStub[];
