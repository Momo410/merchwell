import { DefaultSandbox, defineSandbox } from "eve/sandbox";

// The agent runs no shell commands; never let eve dev or eve eval install just-bash into the app.
export const environment = DefaultSandbox.environment({ justBash: { autoInstall: false } });

export default defineSandbox(() => environment.open());
