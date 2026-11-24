import type { ToolStub } from "eve/evals";

// A 60-piece quote as make-quote returns it, so quote evals need no browser cart.
export const QUOTE_OUTPUT = {
  email: "/quotes/Q-EVAL-v1/email.html",
  needsReview: false,
  nextBreaks: ["Heavyweight Hoodie: order 100 or more (40 more) and each drops to $46.00"],
  ok: true,
  page: "/quotes/Q-EVAL-v1/quote.html",
  pdf: "/quotes/Q-EVAL-v1/quote.pdf",
  pieces: 60,
  priceLockedUntil: "December 4, 2026",
  quoteNumber: "Q-EVAL-v1",
  shortInStock: [],
  stockChecked: true,
  total: "$3,060.00",
  unchanged: false,
  version: 1,
};

export const quoteStubs = [
  { id: "quote", outcome: { response: QUOTE_OUTPUT }, tool: "make-quote" },
  {
    id: "send",
    outcome: {
      response: {
        discount: { appliedToCart: false, code: "MERCHWELL10", percent: 10 },
        email: "sent",
        ok: true,
        ownerNotified: true,
        payLink: { total: "$2,754.00", url: "https://example.myshopify.com/invoices/eval" },
        quoteNumber: "Q-EVAL-v1",
        savedAsLead: true,
      },
    },
    tool: "send-quote",
  },
] satisfies readonly ToolStub[];
