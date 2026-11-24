import { defineEval } from "eve/evals";

export default defineEval({
  description: "A price question is answered and a quote offered, but no quote is made unasked.",
  async test(t) {
    await t.send("How much is a heavyweight hoodie if we order 50?");
    t.succeeded();
    t.notCalledTool("make-quote");
    t.notCalledTool("update-cart");
  },
});
