// Eve names each tool after its file in agent/tools/, so rename both together.
export const AGENT_TOOL = {
  askQuestion: "ask_question",
  browseCollections: "browse-collections",
  getCart: "get-cart",
  getProductDetails: "get-product-details",
  getRecommendations: "get-recommendations",
  makeQuote: "make-quote",
  salesReport: "sales-report",
  navigate: "navigate",
  presentProducts: "present-products",
  searchPolicies: "search-policies",
  searchProducts: "search-products",
  sendQuote: "send-quote",
  updateCart: "update-cart",
} as const;

// Browse results stay hidden; only present-products picks are drawn, or a whole collection shows as cards.
export const PRODUCT_CARD_TOOLS: ReadonlySet<string> = new Set([
  AGENT_TOOL.getRecommendations,
  AGENT_TOOL.presentProducts,
]);
