import { defineEval } from "eve/evals";
import { satisfies } from "eve/evals/expect";

import { quoteStubs } from "../quote-stubs";
import { checkVoice } from "../voice-rules";

const TEN_PERCENT = /\b(10|ten)\s?(%|percent)/i;

export default defineEval({
  description:
    "After a 60-piece quote, the same reply offers email and the 10% for leaving details.",
  async test(t) {
    const session = await t.session({ stubs: quoteStubs });
    const turn = await session.send("Make a quote for my cart, it is for the Acme offsite.");
    turn.expectOk();
    turn.calledTool("make-quote");
    turn.notCalledTool("send-quote");
    checkVoice(t, turn.reply);
    t.check(
      turn.reply ?? "",
      satisfies((value) => TEN_PERCENT.test(String(value)), "mentions the 10% offer"),
    );
    t.judge("The reply asks once whether the shopper wants the quote by email.").gate(0.7);
  },
});
