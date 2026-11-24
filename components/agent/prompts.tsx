"use client";

import { Field, FieldError, FieldLabel } from "@ui-sdk/react/field";
import { Input } from "@ui-sdk/react/input";
import { Toolbar, ToolbarButton } from "@ui-sdk/react/toolbar";
import type { Interaction } from "eve/react";
import { type FormEvent, useState } from "react";

import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { AGENT_TOOL } from "@/lib/agent/tools";

// eve's ask_question marks its first option "(Recommended)"; shoppers only need the choice.
export const plainLabel = (label: string) => label.replace(/\s*\(recommended\)\s*$/i, "");

const CHIP =
  "flex min-h-9 cursor-pointer items-center rounded-full border border-border bg-card px-3.5 py-1.5 text-left text-[13px] text-foreground transition-colors hover:border-foreground data-disabled:cursor-not-allowed data-disabled:opacity-50";
const LABEL = "font-mono text-[10px] text-muted-foreground uppercase tracking-[0.12em]";

const WELCOME_CHIPS = [
  { label: "Plan a team order", text: "I'm planning merch for my team." },
  { label: "Quote my cart", text: "Make a quote for my cart." },
  { label: "10% off for teams", text: "How do I get 10% off a team order?" },
];

export function WelcomeChips({
  disabled,
  onPick,
}: {
  disabled: boolean;
  onPick: (text: string) => void;
}) {
  return (
    <Toolbar aria-label="Suggested questions" className="flex flex-wrap gap-2" loop>
      {WELCOME_CHIPS.map((chip) => (
        <ToolbarButton
          key={chip.label}
          className={CHIP}
          disabled={disabled}
          onClick={() => onPick(chip.text)}
        >
          {chip.label}
        </ToolbarButton>
      ))}
    </Toolbar>
  );
}

export type PromptAnswer = { interactionId: string; optionId?: string; text?: string };

export function OpenPrompts({
  disabled,
  items,
  onAnswer,
}: {
  disabled: boolean;
  items: readonly Interaction[];
  onAnswer: (answer: PromptAnswer) => void;
}) {
  return items.map((item) =>
    item.call?.name === AGENT_TOOL.sendQuote && item.request.kind === "approval" ? (
      <ConfirmDetails
        key={item.interactionId}
        disabled={disabled}
        item={item}
        onAnswer={onAnswer}
      />
    ) : (
      <QuestionChips key={item.interactionId} disabled={disabled} item={item} onAnswer={onAnswer} />
    ),
  );
}

function QuestionChips({
  disabled,
  item,
  onAnswer,
}: {
  disabled: boolean;
  item: Interaction;
  onAnswer: (answer: PromptAnswer) => void;
}) {
  return (
    <div className="grid gap-2.5 text-foreground text-sm animate-in fade-in duration-300">
      <p>{item.request.prompt}</p>
      {item.request.options?.length ? (
        <Toolbar aria-label={item.request.prompt} className="flex flex-wrap gap-2" loop>
          {item.request.options.map((option) => (
            <ToolbarButton
              key={option.id}
              className={CHIP}
              disabled={disabled}
              onClick={() => onAnswer({ interactionId: item.interactionId, optionId: option.id })}
              title={option.description}
            >
              {plainLabel(option.label)}
            </ToolbarButton>
          ))}
        </Toolbar>
      ) : null}
    </div>
  );
}

function ConfirmDetails({
  disabled,
  item,
  onAnswer,
}: {
  disabled: boolean;
  item: Interaction;
  onAnswer: (answer: PromptAnswer) => void;
}) {
  const input = (item.call?.input ?? {}) as { email?: string; name?: string; phone?: string };
  const approve = item.request.options?.find((option) => option.id === "approve")?.id ?? "approve";
  const deny = item.request.options?.find((option) => option.id === "deny")?.id ?? "deny";
  const rows = [
    ["Name", input.name],
    ["Email", input.email],
    ["Phone", input.phone],
  ].filter((row): row is [string, string] => Boolean(row[1]));
  return (
    <article className="grid gap-3 rounded-lg border border-border bg-card p-3.5 text-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
      <p className={LABEL}>Just to confirm</p>
      <dl className="grid gap-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-all text-right">{value}</dd>
          </div>
        ))}
      </dl>
      <Toolbar aria-label="Send the quote?" className="grid grid-cols-2 gap-2" loop>
        <ToolbarButton
          className="flex h-9 cursor-pointer items-center justify-center rounded-full bg-foreground font-mono text-[11px] text-background uppercase tracking-[0.08em] transition-opacity hover:opacity-85 data-disabled:cursor-not-allowed data-disabled:opacity-50"
          disabled={disabled}
          onClick={() => onAnswer({ interactionId: item.interactionId, optionId: approve })}
        >
          Yes, send it
        </ToolbarButton>
        <ToolbarButton
          className="flex h-9 cursor-pointer items-center justify-center rounded-full border border-border bg-card font-mono text-[11px] text-foreground uppercase tracking-[0.08em] transition-colors hover:border-foreground data-disabled:cursor-not-allowed data-disabled:opacity-50"
          disabled={disabled}
          onClick={() =>
            onAnswer({
              interactionId: item.interactionId,
              optionId: deny,
              text: "Those details need fixing. Ask me what to change.",
            })
          }
        >
          Fix it
        </ToolbarButton>
      </Toolbar>
    </article>
  );
}

const FIELD = "grid gap-1";
// Field marks every part with data-invalid after a submit finds a problem, so the box and its message turn red together.
const INPUT =
  "h-9 w-full min-w-0 rounded-md border border-border bg-background px-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus:border-foreground data-disabled:opacity-60 data-invalid:border-destructive";
const ERROR = "text-[12px] text-destructive";

const CONTACT_REQUEST = "Please email me this quote.";

// The form's message carries the details to the agent; the chat shows it as a short receipt, not a typed bubble.
export function readQuoteContact(text: string) {
  if (!text.startsWith(CONTACT_REQUEST)) return null;
  return /Email: (.+?)\.(?: Phone:|$)/.exec(text)?.[1] ?? null;
}

export function QuoteContactForm({
  onSubmit,
  pieces,
}: {
  onSubmit: (text: string) => Promise<boolean>;
  pieces: number;
}) {
  const [sent, setSent] = useState(false);
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    if (!name || !email) return;
    setSent(true);
    const accepted = await onSubmit(
      `${CONTACT_REQUEST} Name: ${name}. Email: ${email}.${phone ? ` Phone: ${phone}.` : ""}`,
    );
    // A refused or failed send keeps the typed details so the shopper can retry.
    if (!accepted) setSent(false);
  };
  return (
    <form
      className="grid gap-2.5 rounded-lg border border-border bg-card p-3.5 text-sm animate-in fade-in slide-in-from-bottom-2 duration-500"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-0.5">
        <p className={LABEL}>Email me this quote</p>
        <p className="text-muted-foreground text-[13px]">
          {pieces >= 24
            ? "Leave your details and get 10% off, with a one-click pay link."
            : "PDF and a link to the quote, straight to your inbox."}
        </p>
      </div>
      <Field className={FIELD} disabled={sent} name="name">
        <FieldLabel className="sr-only">Name</FieldLabel>
        <Input autoComplete="name" className={INPUT} maxLength={80} placeholder="Name" required />
        <FieldError className={ERROR} match="valueMissing">
          Add your name.
        </FieldError>
      </Field>
      <Field className={FIELD} disabled={sent} name="email">
        <FieldLabel className="sr-only">Email</FieldLabel>
        <Input
          autoComplete="email"
          className={INPUT}
          inputMode="email"
          maxLength={254}
          // The browser's own email check accepts a domain without a dot, such as name@x.
          pattern="[^@\s]+@[^@\s]+\.[^@\s]{2,}"
          placeholder="Email"
          required
          type="text"
        />
        <FieldError className={ERROR} match="valueMissing">
          Add your email so we can send the quote.
        </FieldError>
        <FieldError className={ERROR} match="patternMismatch">
          That email looks off. Try something like name@gmail.com.
        </FieldError>
      </Field>
      <Field className={FIELD} disabled={sent} name="phone">
        <FieldLabel className="sr-only">Phone or WhatsApp (optional)</FieldLabel>
        <Input
          autoComplete="tel"
          className={INPUT}
          pattern="\+?[0-9 \(\)\-]{6,20}"
          placeholder="Phone or WhatsApp (optional)"
          type="tel"
        />
        <FieldError className={ERROR} match="patternMismatch">
          Use a phone number like +1 555 010 2030.
        </FieldError>
      </Field>
      <button
        className="flex h-9 cursor-pointer items-center justify-center rounded-full bg-foreground font-mono text-[11px] text-background uppercase tracking-[0.08em] transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={sent}
        type="submit"
      >
        Send my quote
      </button>
      <p className="text-muted-foreground text-[11px]">
        Used only to send this quote. You confirm before anything is sent.
      </p>
    </form>
  );
}

export function AnsweredQuestion({ answer, question }: { answer: string; question: string }) {
  return (
    <div className="grid gap-2.5">
      <p>{question}</p>
      <div className="flex justify-end">
        <Bubble className="max-w-[85%]" variant="default">
          <BubbleContent className="rounded-lg px-3.5">{plainLabel(answer)}</BubbleContent>
        </Bubble>
      </div>
    </div>
  );
}
