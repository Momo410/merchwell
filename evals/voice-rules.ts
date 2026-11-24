import type { EveEvalContext } from "eve/evals";
import { satisfies } from "eve/evals/expect";

// The voice rules in agent/instructions.ts that a reply can be checked against without a judge.
export function checkVoice(t: Pick<EveEvalContext, "check">, reply: string | undefined) {
  const text = reply ?? "";
  t.check(
    text,
    satisfies((value) => !String(value).includes("!"), "no exclamation marks"),
  );
  t.check(
    text,
    // The instructions ban em dashes only; an en dash in a size range such as S–XXL is fine.
    satisfies((value) => !/—/.test(String(value)), "no em dashes"),
  );
  t.check(
    text,
    satisfies(
      (value) =>
        String(value)
          .split("\n")
          .filter((line) => line.trim()).length <= 3,
      "three lines at most",
    ),
  ).soft();
  t.check(
    text,
    satisfies(
      (value) => !/\b(tools?|search results|the system|my instructions)\b/i.test(String(value)),
      "never mentions tools or instructions",
    ),
  );
}
