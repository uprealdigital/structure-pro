"use client";

import { useEffect, useRef, useState } from "react";
import { loadConversationWorkspace } from "@/src/features/crm/conversations/server/actions";
import type { ConversationWorkspace } from "@/src/features/crm/conversations/types";
import type { DealStatus } from "@/src/features/crm/deals/types";

type SelectionStatus = "ready" | "pending" | "missing" | "error";

function conversationPath(id?: string): string {
  return id ? `/conversations?conversation=${encodeURIComponent(id)}` : "/conversations";
}

export function useConversationSelection({
  initialSelectedId,
  initialWorkspace,
}: {
  initialSelectedId?: string;
  initialWorkspace?: ConversationWorkspace;
}) {
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [status, setStatus] = useState<SelectionStatus>(
    initialSelectedId && !initialWorkspace ? "missing" : "ready",
  );
  const request = useRef(0);
  const serverWorkspace = useRef(initialWorkspace);
  serverWorkspace.current = initialWorkspace;

  useEffect(() => {
    request.current += 1;
    setSelectedId(initialSelectedId);
    setWorkspace(serverWorkspace.current);
    setStatus(initialSelectedId && !serverWorkspace.current ? "missing" : "ready");
  }, [initialSelectedId, initialWorkspace?.id, initialWorkspace?.deal.id]);

  function replaceUrl(id?: string) {
    window.history.replaceState(window.history.state, "", conversationPath(id));
  }

  function highlightConversation(id: string) {
    if (!id || id === selectedId) return;
    request.current += 1;
    setSelectedId(id);
    setStatus("ready");
    replaceUrl(id);
  }

  async function focusLoadedDeal(dealId: string): Promise<ConversationWorkspace | undefined> {
    const id = selectedId;
    if (!id) return undefined;
    const ticket = request.current + 1;
    request.current = ticket;
    let result: Awaited<ReturnType<typeof loadConversationWorkspace>>;
    try {
      result = await loadConversationWorkspace(id, dealId);
    } catch {
      return undefined;
    }
    if (ticket !== request.current) return undefined;
    if ("error" in result || !result.data) return undefined;
    setWorkspace(result.data);
    setStatus("ready");
    return result.data;
  }

  async function selectConversation(id: string, dealId?: string) {
    if (id === selectedId && (status === "ready" || status === "pending")) return;

    const ticket = request.current + 1;
    request.current = ticket;
    setSelectedId(id);
    setStatus("pending");
    replaceUrl(id);

    let result: Awaited<ReturnType<typeof loadConversationWorkspace>>;
    try {
      result = await loadConversationWorkspace(id, dealId);
    } catch {
      if (ticket !== request.current) return;
      setWorkspace(undefined);
      setStatus("error");
      return;
    }
    if (ticket !== request.current) return;
    if ("error" in result) {
      setWorkspace(undefined);
      setStatus("error");
      return;
    }

    setWorkspace(result.data ?? undefined);
    setStatus(result.data ? "ready" : "missing");
  }

  function clearConversation() {
    request.current += 1;
    setSelectedId(undefined);
    setWorkspace(undefined);
    setStatus("ready");
    replaceUrl();
  }

  function patchDealStatus(dealId: string, nextStatus: DealStatus) {
    setWorkspace((current) => {
      if (!current) return current;
      const deals = current.deals.map((option) =>
        option.deal.id === dealId
          ? {
              ...option,
              stage: nextStatus,
              deal: {
                ...option.deal,
                previousStatus:
                  option.deal.status === nextStatus ? option.deal.previousStatus : option.deal.status,
                status: nextStatus,
              },
            }
          : option,
      );
      const deal =
        current.deal.id === dealId
          ? {
              ...current.deal,
              previousStatus:
                current.deal.status === nextStatus ? current.deal.previousStatus : current.deal.status,
              status: nextStatus,
            }
          : current.deal;
      return { ...current, deal, deals };
    });
  }

  return {
    selectedId,
    workspace,
    status,
    selectConversation,
    focusLoadedDeal,
    highlightConversation,
    clearConversation,
    patchDealStatus,
  };
}
