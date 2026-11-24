import { defineEval } from "eve/evals";

import { checkVoice } from "../voice-rules";

export default defineEval({
  description: "A hello gets a short, warm reply with one next step and no tools.",
  async test(t) {
    const turn = await t.send("hi");
    t.succeeded();
    t.usedNoTools().soft();
    checkVoice(t, turn.reply);
    t.judge(
      "The reply is warm and brief, offers help with merch for a team, and ends with one clear next step or question.",
    ).atLeast(0.7);
  },
});
