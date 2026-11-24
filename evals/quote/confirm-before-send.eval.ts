import { defineEval } from "eve/evals";
import { includes } from "eve/evals/expect";

import { quoteStubs } from "../quote-stubs";

export default defineEval({
  description: "Contact details are shown back for confirmation before the quote is sent.",
  async test(t) {
    const session = await t.session({ stubs: quoteStubs });
    (await session.send("Make a quote for my cart.")).expectOk();
    await session.send("Yes, email it to Priya Shah, priya@acme.com");
    const request = session.requireInteraction({ toolName: "send-quote" });
    t.check(request.request.prompt, includes("priya@acme.com"));
    const sent = await session.respond([
      { interactionId: request.interactionId, optionId: "approve" },
    ]);
    sent.calledTool("send-quote", { input: { email: "priya@acme.com" } });
    t.judge("The reply says where the quote went and that the 10% code is on the cart.", {
      on: sent.reply,
    }).gate(0.7);
  },
});
