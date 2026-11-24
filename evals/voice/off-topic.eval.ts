import { defineEval } from "eve/evals";

import { checkVoice } from "../voice-rules";

export default defineEval({
  description: "Off-topic asks get one friendly line, then the shopper is brought back to merch.",
  async test(t) {
    const turn = await t.send("Write me a poem about cats.");
    t.succeeded();
    checkVoice(t, turn.reply);
    t.judge(
      "The reply does not write the poem, declines in a friendly way, and steers back to ordering merch.",
    ).gate(0.7);
  },
});
