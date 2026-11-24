import { google } from "@ai-sdk/google";
import { defineAgent } from "eve";
import { chatgpt } from "eve/models/openai";

// MERCHWELL_MODEL=chatgpt borrows this PC's Codex login; eve can't deploy it, so deployments stay on Gemini (GOOGLE_GENERATIVE_AI_API_KEY).
const model =
  process.env.MERCHWELL_MODEL === "chatgpt" ? chatgpt() : google("gemini-3.5-flash-lite");

export default defineAgent({
  // Hyper Elements draws PDFs and images with native resvg, which can't be bundled; "pkg*" copies whole packages
  // whose data files (harfbuzz wasm, PDF standard fonts) are read at runtime and missed by tracing.
  build: { externalDependencies: ["@hyper-elements/react", "harfbuzzjs*", "pdfkit*"] },
  defaultTools: false,
  // Anonymous sessions have the unknown audience, whose derived retention deletes run data and breaks chat restore.
  experimental: { workflow: { retention: "default" } },
  model,
  reasoning: "low",
});
