"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { loadConversation } from "@/src/features/crm/conversations/server/actions";
import type { ConversationDetail } from "@/src/features/crm/conversations/types";
import type { DealStatus } from "@/src/features/crm/deals/types";

type SelectionStatus = "ready" | "pending" | "missing" | "error";

function conversationPath(id?: string, dealId?: string): string {
  const base = window.location.pathname === "/conversations" ? "/conversations" : "/";
  if (!id) return base;
  const params = new URLSearchParams({ conversation: id });
  if (dealId) params.set("deal", dealId);
  return `${base}?${params.toString()}`;
}

function showMobileInbox(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(min-width: 1024px)").matches) return false;
  return !new URLSearchParams(window.location.search).has("conversation");
}

export function useConversationSelection({
  initialSelectedId,
  initialConversation,
  initialDealId,
}: {
  initialSelectedId?: string;
  initialConversation?: ConversationDetail;
  initialDealId?: string;
}) {
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [conversation, setConversation] = useState(initialConversation);
  const [dealId, setDealId] = useState(initialDealId);
  const [status, setStatus] = useState<SelectionStatus>(
    initialSelectedId && !initialConversation ? "missing" : "ready",
  );
  const request = useRef(0);
  const serverConversation = useRef(initialConversation);
  serverConversation.current = initialConversation;

  useLayoutEffect(() => {
    if (!showMobileInbox()) return;
    request.current += 1;
    setSelectedId(undefined);
    setConversation(undefined);
    setStatus("ready");
  }, [initialSelectedId, initialConversation?.id, initialDealId]);

  useEffect(() => {
    request.current += 1;
    if (showMobileInbox()) {
      setSelectedId(undefined);
      setConversation(undefined);
      setStatus("ready");
      return;
    }
    setSelectedId(initialSelectedId);
    setConversation(serverConversation.current);
    setDealId(initialDealId);
    setStatus(initialSelectedId && !serverConversation.current ? "missing" : "ready");
  }, [initialSelectedId, initialConversation?.id, initialDealId]);

  function replaceUrl(id?: string, nextDealId?: string) {
    window.history.replaceState(window.history.state, "", conversationPath(id, nextDealId));
  }

  function highlightConversation(id: string) {
    if (!id || id === selectedId) return;
    request.current += 1;
    setSelectedId(id);
    setStatus("ready");
    replaceUrl(id, dealId);
  }

  async function focusLoadedDeal(nextDealId: string): Promise<ConversationDetail | undefined> {
    const id = selectedId;
    if (!id) return undefined;
    const ticket = request.current + 1;
    request.current = ticket;
    let result: Awaited<ReturnType<typeof loadConversation>>;
    try {
      result = await loadConversation(id);
    } catch {
      return undefined;
    }
    if (ticket !== request.current) return undefined;
    if ("error" in result || !result.data) return undefined;
    setConversation(result.data);
    setDealId(nextDealId);
    setStatus("ready");
    return result.data;
  }

  async function selectConversation(id: string, nextDealId?: string) {
    if (id === selectedId && (status === "ready" || status === "pending")) return;

    const ticket = request.current + 1;
    request.current = ticket;
    setSelectedId(id);
    setDealId(nextDealId);
    setStatus("pending");
    replaceUrl(id, nextDealId);

    let result: Awaited<ReturnType<typeof loadConversation>>;
    try {
      result = await loadConversation(id);
    } catch {
      if (ticket !== request.current) return;
      setConversation(undefined);
      setStatus("error");
      return;
    }
    if (ticket !== request.current) return;
    if ("error" in result) {
      setConversation(undefined);
      setStatus("error");
      return;
    }

    setConversation(result.data ?? undefined);
    setStatus(result.data ? "ready" : "missing");
  }

  function clearConversation() {
    request.current += 1;
    setSelectedId(undefined);
    setConversation(undefined);
    setDealId(undefined);
    setStatus("ready");
    replaceUrl();
  }

  function patchDealStatus(nextDealId: string, nextStatus: DealStatus) {
    setConversation((current) => {
      if (!current) return current;
      return {
        ...current,
        customer: {
          ...current.customer,
          deal_customers: current.customer.deal_customers.map((link) => {
            if (link.deal.id !== nextDealId) return link;
            return {
              ...link,
              deal: {
                ...link.deal,
                previous_status:
                  link.deal.status === nextStatus ? link.deal.previous_status : link.deal.status,
                status: nextStatus,
              },
            };
          }),
        },
      };
    });
  }

  return {
    selectedId,
    conversation,
    dealId,
    status,
    selectConversation,
    focusLoadedDeal,
    highlightConversation,
    clearConversation,
    patchDealStatus,
  };
}
