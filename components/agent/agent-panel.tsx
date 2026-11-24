"use client";

import { createToaster, Toast, ToastClose, ToastRegion, ToastTitle } from "@ui-sdk/react/toast";
import { activeTurn, idle, openInteractions } from "eve/events";
import { useEveAgent } from "eve/react";
import { Trash2Icon, XIcon } from "@/components/ui/pixel-icons";
import Image from "next/image";
import { type RefObject, useCallback, useEffect, useRef, useState } from "react";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { readStoredChat, writeStoredChat } from "@/lib/agent/chat/client";

import { AgentCartBridge } from "./cart-bridge";
import { ChatMessage } from "./chat-message";
import { AgentComposer } from "./composer";
import { OpenPrompts, type PromptAnswer, WelcomeChips } from "./prompts";
import { AgentThinking } from "./thinking";

const CANCEL_TIMEOUT_MS = 10_000;
// One notice at a time: a fixed id updates the showing toast in place instead of stacking a second one.
const NOTICE_ID = "agent-notice";
const UNAVAILABLE = "The assistant is unavailable. Try again, or clear an expired conversation.";

function prepareAgentSession() {
  return fetch("/api/agent/session", {
    credentials: "same-origin",
    method: "POST",
    redirect: "error",
  }).then((response) => {
    if (!response.ok) throw new Error("Could not prepare the assistant. Please try again.");
  });
}

export interface AgentPanelProps {
  draft?: { text: string } | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  triggerRef: RefObject<HTMLElement | null>;
}

export function AgentPanel({ draft, onOpenChange, open, triggerRef }: AgentPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [stored] = useState(readStoredChat);
  // Idle stored sessions replay on first open; an interrupted turn resumes at once so its cart writes reconcile.
  const [resumePending, setResumePending] = useState(Boolean(stored.session && !stored.turnActive));
  const [input, setInput] = useState(draft?.text || stored.input);
  const [seenDraft, setSeenDraft] = useState(draft);
  if (draft !== seenDraft) {
    setSeenDraft(draft);
    if (draft?.text) setInput(draft.text);
  }
  const snapshot = useRef(stored);
  const [clearing, setClearing] = useState(false);
  const [toaster] = useState(() => createToaster());
  useEffect(() => () => void toaster.dismiss(), [toaster]);
  const setNotice = useCallback(
    (message: string | null, type: "error" | "info" = "error") => {
      if (message === null) toaster.dismiss(NOTICE_ID);
      else
        toaster({ duration: type === "error" ? 8000 : 6000, id: NOTICE_ID, title: message, type });
    },
    [toaster],
  );
  const sessionPrep = useRef<Promise<void> | null>(null);
  // The cart cookie outlives each turn, so prepare it once and keep sends off the network.
  const prepareSession = useCallback(() => {
    if (sessionPrep.current) return sessionPrep.current;
    const promise = prepareAgentSession();
    sessionPrep.current = promise;
    promise.catch(() => {
      if (sessionPrep.current === promise) sessionPrep.current = null;
    });
    return promise;
  }, []);
  const agent = useEveAgent({
    // Follow only while work runs, so an idle panel holds no open stream.
    followWhile: (view) => !idle(view),
    initialSession: stored.session,
    onSessionChange(session) {
      snapshot.current.session = session ? { ...session, streamIndex: 0 } : undefined;
      writeStoredChat(snapshot.current);
    },
    async prepareSend(turn) {
      await prepareSession();
      const clientContext = { pathname: location.pathname, search: location.search };
      return turn.answers
        ? { ...turn, clientContext }
        : { ...turn, clientContext, turnPolicy: "queue" };
    },
    resume: Boolean(stored.session && stored.turnActive),
  });
  const { messages, status, view } = agent;
  // A budget prompt holds its turn open; Shop Agent never offers to continue past the limit.
  const hasReachedLimit = openInteractions(view, { kind: "budget" }).length > 0;
  const restoring = resumePending || status === "resuming";
  const busy = !hasReachedLimit && status === "busy";
  const awaitingReply = busy && messages.at(-1)?.role === "user";
  // A send still in flight or failed is only an echo; it must not unmount the quote's email form and its typed details.
  const latestIndex = messages.findLastIndex(
    (message) => message.metadata?.status !== "failed" && message.metadata?.status !== "submitted",
  );
  const prompts = openInteractions(view).filter(
    (item) =>
      (item.request.kind === "approval" || item.request.kind === "question") &&
      item.answer === undefined,
  );
  useEffect(() => {
    if (open) void prepareSession().catch(() => {});
  }, [open, prepareSession]);
  useEffect(() => {
    snapshot.current.turnActive = busy;
    writeStoredChat(snapshot.current);
  }, [busy]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);
  const userScrollRef = useRef(false);
  const pointerDownRef = useRef(false);
  const scrollToBottom = useCallback(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, []);
  const markUserScroll = useCallback(() => {
    userScrollRef.current = true;
  }, []);
  // Programmatic scrolls also fire scroll events; only user input may unpin from the bottom.
  const handleScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 48;
    if (atBottom) pinnedRef.current = true;
    else if (userScrollRef.current || pointerDownRef.current) pinnedRef.current = false;
    userScrollRef.current = false;
  }, []);
  // The sheet renders its content after the panel mounts, so observe the node when it attaches.
  const observeContent = useCallback(
    (content: HTMLDivElement | null) => {
      const scroller = content?.parentElement;
      if (!content || !scroller) return;
      const observer = new ResizeObserver(() => {
        if (pinnedRef.current) scrollToBottom();
      });
      observer.observe(content);
      observer.observe(scroller);
      return () => observer.disconnect();
    },
    [scrollToBottom],
  );
  useEffect(() => {
    if (open) scrollToBottom();
  }, [open, scrollToBottom]);
  const [restoreDelayElapsed, setRestoreDelayElapsed] = useState(false);
  useEffect(() => {
    if (status !== "resuming") return;
    const timer = setTimeout(() => setRestoreDelayElapsed(true), 400);
    return () => clearTimeout(timer);
  }, [status]);
  const showRestoring = status === "resuming" && restoreDelayElapsed;
  useEffect(() => {
    snapshot.current.input = input;
    const timer = setTimeout(() => writeStoredChat(snapshot.current), 400);
    return () => clearTimeout(timer);
  }, [input]);
  useEffect(() => {
    const flush = () => writeStoredChat(snapshot.current);
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);
  // A broken connection is state, not an event: show it whenever the panel is open with the error present.
  useEffect(() => {
    if (open && agent.error) setNotice(UNAVAILABLE);
  }, [agent.error, open, setNotice]);
  const handleStop = () => {
    setNotice(null);
    void agent.cancel().catch(() => {
      setNotice("Could not stop the response. Please try again.");
    });
  };
  const handleSend = async (text: string) => {
    if (busy || restoring || clearing || hasReachedLimit) return false;
    pinnedRef.current = true;
    snapshot.current.turnActive = true;
    writeStoredChat(snapshot.current);
    setNotice(null);
    setInput("");
    // eve takes a typed reply as the open question's answer, so a sent message's echo would never be confirmed and linger.
    const question = prompts.find((item) => item.request.kind === "question");
    try {
      if (question) await agent.respond([{ interactionId: question.interactionId, text }]);
      else await agent.send(text);
      return true;
    } catch {
      setNotice("Could not send your message. Try again, or clear an expired conversation.");
      return false;
    }
  };
  const handleAnswer = (answer: PromptAnswer) => {
    if (restoring || clearing) return;
    pinnedRef.current = true;
    setNotice(null);
    void agent.respond([answer]).catch(() => {
      setNotice("Could not send your answer. Please try again.");
    });
  };
  const handleClear = async () => {
    if (clearing) return;
    setClearing(true);
    setNotice(null);
    const interrupted = busy || activeTurn(view) !== undefined;
    try {
      if (interrupted) {
        const delivery = await agent.cancel();
        await delivery.result({ signal: AbortSignal.timeout(CANCEL_TIMEOUT_MS) });
      }
      agent.newSession();
      setResumePending(false);
      setInput("");
      snapshot.current = { input: "" };
      writeStoredChat(snapshot.current);
      if (interrupted)
        setNotice(
          "Started a new chat. Check your cart before repeating an interrupted change.",
          "info",
        );
    } catch {
      setNotice(
        "Could not confirm the response stopped. Your conversation was kept. Try Stop or Clear again.",
      );
    } finally {
      setClearing(false);
    }
  };
  return (
    <Sheet
      disablePointerDismissal
      modal={false}
      onOpenChange={(next, details) => {
        // Escape on a focused toast closes only that toast, not the chat behind it.
        const target = details.event?.target;
        if (
          !next &&
          details.reason === "escape-key" &&
          target instanceof Element &&
          target.closest('[data-slot="toast-region"]')
        ) {
          details.cancel();
          return;
        }
        if (!next) toaster.dismiss();
        onOpenChange(next);
      }}
      onOpenChangeComplete={(opened) => {
        if (!opened) return;
        scrollToBottom();
        if (!resumePending) return;
        setResumePending(false);
        void agent.resume().catch(() => {});
      }}
      open={open}
    >
      <SheetContent
        ref={panelRef}
        backdrop={false}
        data-theme="signal"
        className="dot-grid inset-y-auto right-4 bottom-22 h-[min(640px,calc(100dvh-8rem))] w-[calc(100%-2rem)] max-w-100 origin-bottom-right gap-0 overflow-clip rounded-2xl border border-border bg-background p-0 text-foreground shadow-2xl shadow-black/60 data-open:duration-300 data-closed:duration-200 data-starting-style:translate-x-0 data-starting-style:translate-y-3 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:translate-x-0 data-ending-style:translate-y-3 data-ending-style:scale-95 data-ending-style:opacity-0 sm:right-5"
        closeButton={false}
        finalFocus={triggerRef}
        initialFocus={() => panelRef.current?.querySelector("textarea") ?? true}
        keepMounted
        overlay={false}
        side="right"
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-4">
          <div className="flex items-center gap-3">
            <span className="size-2.5 rounded-full bg-[var(--signal-red)]" />
            <div className="grid">
              <SheetTitle className="font-pixel text-lg leading-5 tracking-wider">
                MERCHWELL (R)
              </SheetTitle>
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.12em]">
                Quote agent · Hyper Elements
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              aria-label="Clear chat"
              className="flex cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              disabled={clearing || (!messages.length && !input.trim() && !agent.session && !busy)}
              onClick={handleClear}
              type="button"
            >
              <Trash2Icon className="size-5" />
            </button>
            <SheetClose
              aria-label="Close Shop Agent"
              className="flex cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            >
              <XIcon className="size-5" />
            </SheetClose>
          </div>
        </div>
        <SheetDescription className="sr-only">
          Find products, ask store questions, and manage your cart.
        </SheetDescription>
        <div
          ref={scrollRef}
          data-slot="agent-messages"
          onKeyDown={markUserScroll}
          onPointerDown={() => {
            pointerDownRef.current = true;
          }}
          onPointerUp={() => {
            pointerDownRef.current = false;
          }}
          onScroll={handleScroll}
          onTouchMove={markUserScroll}
          onWheel={markUserScroll}
          className="min-h-0 flex-auto overflow-x-hidden overflow-y-auto overscroll-contain"
        >
          <div
            ref={observeContent}
            aria-busy={busy}
            aria-label="Conversation"
            data-empty={messages.length === 0}
            // The welcome card sits by the composer; a conversation reads from the top, so the first answer doesn't sit low.
            className="flex min-h-full flex-col justify-start gap-6 px-4 py-5 data-[empty=true]:justify-end [&>*]:shrink-0"
            role="log"
          >
            {messages.length === 0
              ? restoring
                ? showRestoring && (
                    <p className="text-muted-foreground text-sm">Restoring your conversation…</p>
                  )
                : !awaitingReply && (
                    <div className="grid gap-3 rounded-lg border border-border bg-card p-4 text-sm">
                      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.12em]">
                        <span className="text-[var(--signal-red)]">●</span> Online
                      </p>
                      <p className="text-foreground">
                        Custom merch for your team, priced in seconds.
                      </p>
                      <p className="text-muted-foreground">
                        Tell me what you need, like 150 hoodies for an offsite. I check live stock,
                        show the price breaks, and turn your cart into a quote: web page, email,
                        PDF.
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.12em]">
                        Prices lock for 14 days ›
                      </p>
                      <WelcomeChips
                        disabled={busy || clearing || hasReachedLimit}
                        onPick={handleSend}
                      />
                    </div>
                  )
              : messages.map((message, index) => (
                  <ChatMessage
                    key={message.id}
                    isLatest={index === latestIndex}
                    isStreaming={!hasReachedLimit && message.metadata?.status === "streaming"}
                    message={message}
                    onSend={handleSend}
                  />
                ))}
            {!busy && (
              <OpenPrompts
                disabled={restoring || clearing}
                items={prompts}
                onAnswer={handleAnswer}
              />
            )}
            {awaitingReply && <AgentThinking active />}
          </div>
        </div>
        {(clearing || (showRestoring && messages.length > 0)) && (
          <p role="status" className="px-2.5 py-2 text-muted-foreground text-xs">
            {clearing
              ? "Waiting for the response to stop…"
              : "Restoring your conversation… Clear chat to start fresh."}
          </p>
        )}
        {hasReachedLimit && (
          <p role="alert" className="px-2.5 py-2 text-muted-foreground text-xs">
            This conversation has reached its limit. Clear chat to start a new conversation.
          </p>
        )}
        <AgentCartBridge messages={messages} restoring={restoring} />
        <AgentComposer
          disabled={!busy && (clearing || hasReachedLimit)}
          onChange={(value) => {
            setInput(value);
            void prepareSession().catch(() => {});
          }}
          onStop={handleStop}
          onSubmit={handleSend}
          placeholder="What does your team need?"
          status={restoring ? "resuming" : busy ? "busy" : "idle"}
          value={input}
        />
        <p className="flex items-center justify-center gap-1.5 border-t border-border bg-card px-4 py-2 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.12em]">
          Built with
          <a
            className="flex items-center gap-1 transition-colors hover:text-foreground"
            href="https://github.com/vercel/eve"
            rel="noreferrer"
            target="_blank"
          >
            <Image
              alt=""
              className="size-3.5 rounded-[3px]"
              height={14}
              sizes="100vw"
              src="/brand/eve.svg"
              unoptimized
              width={14}
            />
            eve
          </a>
          +
          <a
            className="flex items-center gap-1 transition-colors hover:text-foreground"
            href="https://github.com/hyper-elements/hyper-elements"
            rel="noreferrer"
            target="_blank"
          >
            <Image
              alt=""
              className="size-3.5 rounded-[3px]"
              height={14}
              sizes="100vw"
              src="/brand/hyper-elements.svg"
              unoptimized
              width={14}
            />
            Hyper Elements
          </a>
        </p>
        {/* Top-layer toasts, placed over the panel just above the composer. Errors are announced at once, others politely. */}
        <ToastRegion
          aria-label="Chat notices"
          toaster={toaster}
          className="fixed top-auto right-7 bottom-[calc(5.5rem+4.75rem)] left-auto m-0 h-(--toast-front-height) w-[calc(100%-3.5rem)] max-w-94 overflow-visible border-0 bg-transparent p-0 sm:right-8"
          side="bottom"
          align="end"
        >
          {() => (
            <Toast className="group absolute inset-x-0 bottom-0 flex h-(--toast-height) translate-x-(--toast-swipe-x,0px) translate-y-(--toast-swipe-y,0px) items-start gap-2.5 overflow-hidden rounded-lg border border-border bg-card px-3 py-2.5 text-foreground text-xs shadow-lg shadow-black/10 transition-[translate,opacity,height] duration-300 select-none data-ending-style:opacity-0 data-starting-style:translate-y-2 data-starting-style:opacity-0 data-swiping:transition-none motion-reduce:transition-opacity">
              <span
                aria-hidden="true"
                className="mt-1 size-2 shrink-0 rounded-full bg-muted-foreground group-data-[type=error]:bg-[var(--signal-red)]"
              />
              <ToastTitle className="min-w-0 flex-1 leading-relaxed" />
              <ToastClose
                aria-label="Dismiss"
                className="-m-1 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
              >
                <XIcon aria-hidden="true" className="size-3.5" />
              </ToastClose>
            </Toast>
          )}
        </ToastRegion>
      </SheetContent>
    </Sheet>
  );
}
