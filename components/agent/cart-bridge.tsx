"use client";

import type { EveMessage } from "eve/react";
import { useCallback, useEffect, useRef } from "react";

import { isCartMutation } from "@/lib/agent/cart";
import { setAgentCartPending } from "@/lib/agent/cart/client";
import { isSettledToolPart, isToolPart } from "@/lib/agent/messages";
import { AGENT_TOOL } from "@/lib/agent/tools";
import { useCart, useCartActions } from "@/lib/cart/client";

const REFRESH_TIMEOUT_MS = 5_000;

interface CartRefresh {
  observedLoading: boolean;
  timer: ReturnType<typeof setTimeout>;
}

export function AgentCartBridge({
  messages,
  restoring,
}: {
  messages: readonly EveMessage[];
  restoring: boolean;
}) {
  const { refresh } = useCartActions();
  const loading = useCart((state) => state.loading || state.revalidating);
  const writing = messages.some((message) =>
    message.parts.some(
      (part) => isToolPart(part) && isCartMutation(part.name) && !isSettledToolPart(part),
    ),
  );
  const settled = useRef(new Set<string>());
  const writingNow = useRef(writing);
  const refreshing = useRef<CartRefresh | null>(null);
  const publish = useCallback(
    () => setAgentCartPending(writingNow.current || refreshing.current !== null),
    [],
  );
  const finishRefresh = useCallback(() => {
    if (refreshing.current) clearTimeout(refreshing.current.timer);
    refreshing.current = null;
    publish();
  }, [publish]);

  useEffect(() => {
    writingNow.current = writing;
    publish();
  }, [publish, writing]);

  // A settled cart call may have changed the cart even when it failed; send-quote can add the lead code to it.
  useEffect(() => {
    let settledNow = false;
    for (const message of messages)
      for (const part of message.parts) {
        if (!isToolPart(part) || !isSettledToolPart(part)) continue;
        if (!isCartMutation(part.name) && part.name !== AGENT_TOOL.sendQuote) continue;
        if (settled.current.has(part.callId)) continue;
        settled.current.add(part.callId);
        settledNow = true;
      }
    if (!settledNow || restoring) return;
    if (refreshing.current) clearTimeout(refreshing.current.timer);
    refreshing.current = {
      observedLoading: false,
      timer: setTimeout(finishRefresh, REFRESH_TIMEOUT_MS),
    };
    publish();
    refresh();
  }, [finishRefresh, messages, publish, refresh, restoring]);

  useEffect(() => {
    const current = refreshing.current;
    if (!current) return;
    if (loading) current.observedLoading = true;
    else if (current.observedLoading) finishRefresh();
  }, [finishRefresh, loading]);

  useEffect(
    () => () => {
      if (refreshing.current) clearTimeout(refreshing.current.timer);
      setAgentCartPending(false);
    },
    [],
  );

  return null;
}
