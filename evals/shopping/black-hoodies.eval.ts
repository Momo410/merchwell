import { defineEval } from "eve/evals";

import { checkVoice } from "../voice-rules";

export default defineEval({
  description: "A clear product ask searches Shopify and presents cards with a short lead-in.",
  async test(t) {
    const turn = await t.send("Show me black hoodies.");
    t.succeeded();
    t.calledTool("search-products");
    t.calledTool("present-products");
    checkVoice(t, turn.reply);
    t.judge(
      "The reply is a short lead-in of three lines or fewer to the product cards shown below it, and it does not list prices.",
    ).atLeast(0.7);
  },
});
