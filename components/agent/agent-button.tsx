"use client";

import { Popover, PopoverClose, PopoverContent } from "@ui-sdk/react/popover";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { XIcon } from "@/components/ui/pixel-icons";
import { readStoredChat } from "@/lib/agent/chat/client";

import { AgentPanel } from "./client";
import { QUOTE_EVENT, type QuoteEventDetail } from "./quote-trigger";

const TEASER_DELAY_MS = 6000;
const TEASER_KEY = "merchwell:teaser-shown";

export function AgentButton() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState<{ text: string } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // The pop-up anchors to the chat button, so the button is kept in state as well as the panel's ref.
  const [chatButton, setChatButton] = useState<HTMLButtonElement | null>(null);
  const pathname = usePathname();
  const [teaser, setTeaser] = useState<{ path: string; product: string } | null>(null);
  // A product page asks about its product once per visit, and never over a chat already under way.
  useEffect(() => {
    if (!pathname.startsWith("/products/") || open) return;
    try {
      if (sessionStorage.getItem(TEASER_KEY) || readStoredChat().session) return;
    } catch {
      return;
    }
    const timer = setTimeout(() => {
      // On a phone the pop-up would sit over the options and the sticky Add to bag, so the chat button's dot invites instead.
      if (!window.matchMedia("(min-width: 640px)").matches) return;
      const product = document.querySelector("main h1")?.textContent?.trim();
      if (!product) return;
      try {
        sessionStorage.setItem(TEASER_KEY, "1");
      } catch {}
      setTeaser({ path: pathname, product });
    }, TEASER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [open, pathname]);
  // The panel is most of the agent's JavaScript, so it loads on intent; a turn interrupted by navigation mounts it at idle so its cart writes reconcile.
  useEffect(() => {
    if (!readStoredChat().turnActive) return;
    const idle =
      window.requestIdleCallback ?? ((callback: () => void) => setTimeout(callback, 200));
    const cancel = window.cancelIdleCallback ?? clearTimeout;
    const handle = idle(() => setMounted(true));
    return () => cancel(handle as number);
  }, []);
  // Quote buttons across the store open the panel with their request typed in, ready to send.
  useEffect(() => {
    const onQuote = (event: Event) => {
      const prompt = (event as CustomEvent<QuoteEventDetail>).detail?.prompt;
      setMounted(true);
      setOpen(true);
      if (prompt) setDraft({ text: prompt });
    };
    window.addEventListener(QUOTE_EVENT, onQuote);
    return () => window.removeEventListener(QUOTE_EVENT, onQuote);
  }, []);
  const mount = () => setMounted(true);
  const teaserOpen = teaser?.path === pathname && !open;
  const teaserText = teaser
    ? `Ordering ${teaser.product} for a team? I can price it with your logo in seconds.`
    : "";
  return (
    <>
      {/* A UI SDK popover anchored to the chat button: Escape, × or a press elsewhere dismisses it, and it never takes focus. */}
      <Popover
        onOpenChange={(next) => {
          if (!next) setTeaser(null);
        }}
        open={teaserOpen}
      >
        <PopoverContent
          align="end"
          anchor={chatButton}
          aria-label="Quote assistant"
          className="m-0 w-72 max-w-[calc(100vw-2rem)] rounded-2xl rounded-br-sm border-0 bg-[#040404] p-3.5 pr-9 text-white shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300"
          finalFocus={() => triggerRef.current}
          initialFocus="none"
          side="top"
          sideOffset={12}
        >
          <button
            className="block cursor-pointer text-left"
            onClick={() => {
              const product = teaser?.product;
              setTeaser(null);
              setMounted(true);
              setOpen(true);
              if (product) setDraft({ text: `Price ${product} for my team.` });
            }}
            type="button"
          >
            <span className="block font-mono text-xxs tracking-[0.14em] text-white/55 uppercase">
              Quote assistant
            </span>
            <span className="mt-1 block text-sm">{teaserText}</span>
          </button>
          <PopoverClose
            aria-label="Dismiss"
            className="absolute top-2.5 right-2.5 flex size-6 cursor-pointer items-center justify-center rounded-full text-white/60 transition-colors hover:text-white"
          >
            <XIcon className="size-3.5" />
          </PopoverClose>
        </PopoverContent>
      </Popover>
      {/* Focus stays on the page, so the pop-up's line is read out politely instead. */}
      <span aria-live="polite" className="sr-only">
        {teaserOpen ? teaserText : ""}
      </span>
      <button
        ref={(node) => {
          triggerRef.current = node;
          setChatButton(node);
        }}
        aria-expanded={open}
        className="group relative flex size-15 cursor-pointer items-center justify-center rounded-full border border-foreground/10 bg-card text-foreground shadow-[0_18px_40px_-14px_rgb(0_0_0/0.45)] transition-transform duration-300 ease-out-expo hover:scale-105 active:scale-95"
        onClick={() => {
          setMounted(true);
          setOpen((previous) => !previous);
        }}
        onFocus={mount}
        onPointerEnter={mount}
        onTouchStart={mount}
        type="button"
      >
        {open ? (
          <XIcon className="size-5 animate-in fade-in spin-in-45 duration-200" />
        ) : (
          <>
            <DotChatIcon className="size-7 animate-in fade-in duration-200" />
            <span className="absolute top-1 right-1 flex size-3">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-signal opacity-60 motion-reduce:animate-none" />
              <span className="relative inline-flex size-3 rounded-full border-2 border-card bg-signal" />
            </span>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-full mr-3 hidden w-max translate-x-1 rounded-2xl rounded-br-sm bg-[#040404] px-3.5 py-2 text-left text-white opacity-0 shadow-lg transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 md:block"
            >
              <span className="block font-mono text-xxs tracking-[0.14em] text-white/55 uppercase">
                Quote assistant
              </span>
              <span className="block text-sm">Ask for a team quote</span>
            </span>
          </>
        )}
        <span className="sr-only">
          {open ? "Close quote assistant" : "Chat with the quote assistant"}
        </span>
      </button>
      {mounted && (
        <AgentPanel draft={draft} onOpenChange={setOpen} open={open} triggerRef={triggerRef} />
      )}
    </>
  );
}

// Dot-matrix speech bubble with typing dots, drawn on a 3-unit grid like the Merchwell print.
const BUBBLE_DOTS: [number, number][] = [
  ...[1, 2, 3, 4, 5].map((x) => [x, 0] as [number, number]),
  [0, 1],
  [6, 1],
  [0, 2],
  [6, 2],
  [0, 3],
  [6, 3],
  ...[1, 2, 3, 4, 5].map((x) => [x, 4] as [number, number]),
  [1, 5],
  [0, 6],
];
const TYPING_DOTS: [number, number][] = [
  [2, 2],
  [3, 2],
  [4, 2],
];

function DotChatIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 21 21">
      {BUBBLE_DOTS.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x * 3 + 1.5} cy={y * 3 + 1.5} fill="currentColor" r={1.15} />
      ))}
      {TYPING_DOTS.map(([x, y], index) => (
        <circle
          key={`t-${x}`}
          className="animate-pulse motion-reduce:animate-none"
          cx={x * 3 + 1.5}
          cy={y * 3 + 1.5}
          fill="#d71921"
          r={1.15}
          style={{ animationDelay: `${index * 200}ms` }}
        />
      ))}
    </svg>
  );
}
