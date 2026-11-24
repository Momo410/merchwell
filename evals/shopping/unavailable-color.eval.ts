import { defineEval } from "eve/evals";

import { HOODIE, noNavyStubs } from "../catalog-stubs";

export default defineEval({
  description:
    "A color the catalog does not offer is called out first, not hidden behind other cards.",
  async test(t) {
    const session = await t.session({ stubs: noNavyStubs });
    const turn = await session.send("Do you have navy hoodies?");
    turn.expectOk();
    turn.calledTool("search-products");
    t.judge(
      "Judged against these search results, the reply says near the start that navy hoodies are not available, and it does not present navy as something the shopper can buy.",
      { on: { reply: turn.reply ?? "", searchResults: [HOODIE] } },
    ).gate(0.7);
  },
});
