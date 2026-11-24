"use client";

import type { EveMessage } from "eve/react";
import { memo } from "react";
import { defaultUrlTransform, Streamdown, type UrlTransform } from "streamdown";

import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { getCartMutationResult } from "@/lib/agent/cart";
import { completedOutput, isSettledToolPart, isToolPart } from "@/lib/agent/messages";
import { AGENT_TOOL } from "@/lib/agent/tools";

import { DocumentCards } from "./document-card";
import { AnsweredQuestion, QuoteContactForm, readQuoteContact } from "./prompts";
import { ShoppingResults } from "./shopping-results";
import { AgentThinking } from "./thinking";

const SHOPIFY_CDN = "https://cdn.shopify.com/";

const linkSafety = {
  enabled: true,
  onLinkCheck: (url: string) => url.startsWith("/") && !url.startsWith("//"),
};
const urlTransform: UrlTransform = (url, key, node) =>
  key === "src" && !url.startsWith(SHOPIFY_CDN) ? null : defaultUrlTransform(url, key, node);
const Markdown = memo(({ children }: { children: string }) => (
  <Streamdown
    linkSafety={linkSafety}
    urlTransform={urlTransform}
    className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
  >
    {children}
  </Streamdown>
));

export function ChatMessage({
  isLatest,
  isStreaming,
  message,
  onSend,
}: {
  isLatest: boolean;
  isStreaming: boolean;
  message: EveMessage;
  onSend: (text: string) => Promise<boolean>;
}) {
  const text = message.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("");
  const contact = message.role === "user" ? readQuoteContact(text) : null;
  if (contact)
    return (
      <p className="flex justify-end font-mono text-[10px] text-muted-foreground uppercase tracking-[0.12em]">
        ✓ Details sent · {contact}
      </p>
    );
  if (message.role === "user")
    return text ? (
      <div className="flex justify-end">
        <Bubble className="max-w-[85%]" variant="default">
          <BubbleContent className="rounded-lg px-3.5 [&_[data-streamdown=link]]:text-inherit">
            <Markdown>{text}</Markdown>
          </BubbleContent>
        </Bubble>
      </div>
    ) : null;
  const mutations = message.parts.flatMap((part) => {
    const result = getCartMutationResult(part);
    return result ? [result] : [];
  });
  const warnings = [...new Set(mutations.flatMap((mutation) => mutation.warnings))];
  // A quote is the reply's one call to action: the cart's checkout charges list prices, not the quote.
  const quotes = message.parts.some(
    (part) => part.type === "tool" && part.name === AGENT_TOOL.makeQuote,
  );
  // The cart card waits for the turn to settle, so a quote request never flashes a checkout before its quote.
  const showsLiveCart = isLatest && !isStreaming && !quotes && mutations.length > 0;
  const active = message.parts.filter(isToolPart).find((part) => !isSettledToolPart(part));
  const waitsForInput = message.parts.some((part) =>
    part.type === "tool"
      ? part.interaction?.status === "open"
      : part.type === "interaction" && part.status === "open",
  );
  const answered = message.parts.flatMap((part) => {
    if (part.type !== "tool" || part.name !== AGENT_TOOL.askQuestion) return [];
    const output = completedOutput(part) as { answer?: unknown; status?: unknown } | undefined;
    const question = (part.input as { question?: unknown } | undefined)?.question;
    return output?.status === "answered" &&
      typeof output.answer === "string" &&
      typeof question === "string"
      ? [{ answer: output.answer, id: part.callId, question }]
      : [];
  });
  // The latest quote offers the email form, even an unchanged one (a fresh chat on the same cart gets it back); a later message from the shopper retires it.
  const quote = message.parts
    .flatMap((part) => {
      const output =
        part.type === "tool" && part.name === AGENT_TOOL.makeQuote
          ? (completedOutput(part) as Record<string, unknown> | undefined)
          : undefined;
      return output && output.ok === true ? [output] : [];
    })
    .at(-1);
  return (
    <div className="grid gap-2.5 text-foreground text-sm">
      {answered.map((item) => (
        <AnsweredQuestion key={item.id} answer={item.answer} question={item.question} />
      ))}
      {/* Top to bottom in the order things arrive: products and cart come back fast, then the quote, then the
          slower text streams in under them where the shopper is already looking, then the form it asks about. */}
      <ShoppingResults
        confirmation={showsLiveCart ? { warnings } : undefined}
        fallback={
          isLatest && !isStreaming && !text && !waitsForInput ? (
            <p className="text-muted-foreground">No response. Try asking again.</p>
          ) : null
        }
        hideCart={quotes}
        isLatest={isLatest}
        isStreaming={isStreaming}
        message={message}
      />
      {quote && mutations.length > 0 && (
        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.12em]">
          ✓ Cart updated to match this quote
          {warnings.map((warning) => (
            <span key={warning} className="mt-1 block normal-case tracking-normal" role="alert">
              {warning}
            </span>
          ))}
        </p>
      )}
      <DocumentCards message={message} />
      {text && <Markdown>{text}</Markdown>}
      {/* Status sits at the bottom, where the next thing will appear, never above what already happened. */}
      <AgentThinking active={isStreaming && !waitsForInput} tool={active?.name} />
      {quote && isLatest && !isStreaming && (
        <QuoteContactForm onSubmit={onSend} pieces={Number(quote.pieces) || 0} />
      )}
    </div>
  );
}
