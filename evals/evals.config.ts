import { google } from "@ai-sdk/google";
import { defineEvalConfig } from "eve/evals";

// The judge runs on the same Google AI Studio key as the agent, not on Vercel AI Gateway.
export default defineEvalConfig({
  judge: { model: google.decisionModel("gemini-3.5-flash-lite") },
  // The free Gemini tier allows a few requests a minute, so evals run one at a time.
  maxConcurrency: 1,
  timeoutMs: 120_000,
});
