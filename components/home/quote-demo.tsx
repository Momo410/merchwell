"use client";

import Image from "next/image";

import { type Act, Check, Collapse, Field, Stage, Text, Window } from "@/components/stageshow/kit";

import "./quote-demo.css";

// The quote agent at work, after stageshow's ai-cards. Beats: a team request is typed and
// sent; the agent checks stock; the hoodie's real price breaks open with 50+ picked; the
// quote card opens; the PDF is opened from it. Plays once in view; the still is the payoff.

const REQUEST = "60 black hoodies for our offsite, sizes S to XL";
const BREAKS = [
  { min: 24, price: "$68" },
  { min: 50, price: "$62" },
  { min: 100, price: "$58" },
  { min: 250, price: "$52" },
];
const OUTPUTS = ["Page", "Email", "PDF"];

interface Scene {
  draft: string;
  opened: boolean;
  phase: "idle" | "ladder" | "quote" | "thinking";
  sent: boolean;
}

const INITIAL: Scene = { draft: "", opened: false, phase: "idle", sent: false };
const POSTER: Scene = { draft: "", opened: true, phase: "quote", sent: true };

async function script(a: Act<Scene>) {
  await a.wait(700);
  a.mark("type");
  await a.type("draft", REQUEST, { interval: 34 });
  await a.wait(350);
  a.mark("send");
  a.put({ draft: "", sent: true });
  await a.wait(450);
  a.put({ phase: "thinking" });
  await a.wait(1100);
  a.mark("ladder");
  a.put({ phase: "ladder" });
  await a.wait(1500);
  a.mark("quote");
  a.put({ phase: "quote" });
  await a.wait(1100);
  a.mark("pdf");
  await a.click({ at: "pdf", x: 0.5, y: 0.6 });
  a.put({ opened: true });
  await a.wait(2800);
}

const TOKENS = {
  "--ss-accent": "#040404",
  "--ss-accent-soft": "rgb(4 4 4 / 0.05)",
  "--ss-accent-text": "#040404",
  "--ss-font": "var(--font-geist-sans), system-ui, sans-serif",
};

export function QuoteDemo() {
  return (
    <Stage
      className="qd"
      compact={{ below: 600, height: 600, width: 358 }}
      cursor={{ at: { compact: { x: 330, y: 580 }, wide: { x: 610, y: 500 } } }}
      height={520}
      initial={INITIAL}
      play="once"
      poster={POSTER}
      script={script}
      tokens={TOKENS}
      width={640}
    >
      {(s) => {
        const later = s.phase === "ladder" || s.phase === "quote";
        return (
          <Window className="qd-win" title="Merchwell quote agent">
            <div className="qd-body">
              <div className="qd-thread">
                <Collapse from="below" open={s.sent} reveal="drop">
                  <div className="qd-q">
                    <Text>{REQUEST}</Text>
                  </div>
                </Collapse>
                <div className="qd-reply">
                  <Collapse open={s.phase === "thinking"}>
                    <Text className="qd-thinking">Checking stock and price breaks</Text>
                  </Collapse>
                  <Collapse open={later} reveal="drop">
                    <div className="qd-a">
                      <Text className="qd-line">
                        All 60 are in stock. At 50+ each hoodie drops to $62.
                      </Text>
                      <div className="qd-product">
                        <span className="qd-thumb">
                          <Image
                            alt="Heavyweight Hoodie in Black"
                            fill
                            sizes="100vw"
                            src="/images/merch/hoodie-black.png"
                          />
                        </span>
                        <div className="qd-ladder">
                          {BREAKS.map((tier) => (
                            <span
                              className="qd-tier"
                              data-on={tier.min === 50 || undefined}
                              key={tier.min}
                            >
                              <span className="qd-tier__min">{tier.min}+</span>
                              <span className="qd-tier__price">{tier.price}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Collapse>
                  <Collapse open={s.phase === "quote"} reveal="drop">
                    <div className="qd-quote">
                      <div className="qd-quote__top">
                        <span className="qd-mono">Quote Q-261120-4A7C · V1</span>
                        <span className="qd-mono">60 pieces</span>
                      </div>
                      <span className="qd-total">$3,870.00</span>
                      <span className="qd-mono qd-lock">
                        <span className="qd-dot" />
                        Price locked 14 days
                      </span>
                      <div className="qd-outputs">
                        {OUTPUTS.map((output) => {
                          const pdf = output === "PDF";
                          return (
                            <span
                              className="qd-output"
                              data-cursor={pdf ? "pointer" : undefined}
                              data-on={(pdf && s.opened) || undefined}
                              data-target={pdf ? "pdf" : undefined}
                              key={output}
                            >
                              {pdf ? <Check on={s.opened} size={14} /> : null}
                              {output}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </Collapse>
                </div>
              </div>
              <Field
                className="qd-composer"
                focused={!s.sent}
                placeholder="What does your team need?"
                value={s.draft}
              />
            </div>
          </Window>
        );
      }}
    </Stage>
  );
}
