import { defineTool } from "eve/tools";
import { z } from "zod";

import { writeSalesReport } from "../lib/sales-report";

// The chat has no owner login, so the report stays off unless the store owner enables it locally.
const isOwnerMode = () => process.env.SHOP_OWNER_TOOLS === "true";

export default defineTool({
  description:
    "Store owner only: build a net sales report from Shopify orders with Hyper Elements, as a web page, an email and a PDF. It goes gross sales, minus cancellations, minus refunds and returns, to net sales, so it matches payouts. Totals come from Shopify, so never pass amounts. Returns same-site links.",
  inputSchema: z.strictObject({
    days: z
      .number()
      .int()
      .min(1)
      .max(31)
      .optional()
      .describe("How many days back to report, 7 for a weekly report"),
  }),
  async execute({ days }) {
    if (!isOwnerMode())
      return {
        message: "Sales reports are only available to the store owner.",
        ok: false as const,
      };
    return writeSalesReport(days ?? 7);
  },
  label: {
    complete: (_input, output) =>
      output.ok ? `Sales report ${output.reportNumber} ready` : "No report created",
    start: () => "Build sales report",
  },
});
