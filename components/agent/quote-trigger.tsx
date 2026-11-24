"use client";

import type { ComponentProps } from "react";

export const QUOTE_EVENT = "merchwell:quote";

export interface QuoteEventDetail {
  prompt?: string;
}

export function openQuoteAgent(prompt?: string) {
  window.dispatchEvent(new CustomEvent<QuoteEventDetail>(QUOTE_EVENT, { detail: { prompt } }));
}

interface QuoteTriggerProps extends ComponentProps<"button"> {
  prompt?: string;
}

export function QuoteTrigger({ className, prompt, ...props }: QuoteTriggerProps) {
  return (
    <button
      className={`cursor-pointer ${className ?? ""}`}
      onClick={() => openQuoteAgent(prompt)}
      type="button"
      {...props}
    />
  );
}
