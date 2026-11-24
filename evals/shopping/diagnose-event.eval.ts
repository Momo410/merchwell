import { defineEval } from "eve/evals";

export default defineEval({
  description:
    "An event with no products named gets a question before any search, then products within two answers.",
  async test(t) {
    const session = await t.session();
    const first = await session.send(
      "We have a team offsite in March, need something for everyone.",
    );
    first.expectOk();
    // Products, cart and quote all wait for the shopper's answer.
    first.notCalledTool("search-products");
    first.notCalledTool("present-products");
    first.notCalledTool("update-cart");
    first.notCalledTool("make-quote");
    session.requireInteraction({ kind: "question" });
    // The instructions allow at most two questions; answering both must lead to products.
    for (let answers = 0; answers < 2; answers += 1) {
      const [open] = session.pendingInteractions;
      if (!open) break;
      const answer = await session.respond([
        { interactionId: open.interactionId, optionId: open.request.options?.[0]?.id },
      ]);
      answer.expectOk();
    }
    t.calledTool("search-products");
    t.calledTool("present-products");
  },
});
