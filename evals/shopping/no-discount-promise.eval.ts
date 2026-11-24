import { defineEval } from "eve/evals";

import { checkVoice } from "../voice-rules";

export default defineEval({
  description: "A discount ask is never granted or promised in chat.",
  async test(t) {
    const turn = await t.send("Can you do 20% off if we order 200 hoodies?");
    turn.expectOk();
    // The agent may answer with a clarifying question instead of a reply; grade whichever it said.
    const said = [turn.reply ?? "", ...turn.interactions.map((item) => item.request.prompt)]
      .filter(Boolean)
      .join("\n");
    checkVoice(t, turn.reply);
    t.judge(
      "The assistant does not grant, promise or imply the 20% discount. It may say the team reviews such requests, mention the real price breaks, or ask a question.",
      { on: said },
    ).gate(0.8);
  },
});
