import { defineEval } from "eve/evals";

import { catalogDownStubs } from "../catalog-stubs";

export default defineEval({
  description: "When the catalog can't be reached, the agent says so instead of guessing.",
  async test(t) {
    const session = await t.session({ stubs: catalogDownStubs });
    const turn = await session.send("Do you have navy hoodies?");
    turn.expectOk();
    turn.calledTool("search-products");
    t.judge(
      "The store's catalog could not be reached. The reply says it couldn't check right now, and it does not claim navy hoodies are or are not available.",
    ).gate(0.7);
  },
});
