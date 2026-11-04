"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { conversationDetailWireSchema, type ConversationWorkspace } from "@/src/features/crm/conversations/types";
import { workspaceFromWire } from "@/src/features/crm/conversations/utils/wire";
import type { DealStatus } from "@/src/features/crm/deals/types";

type SelectionStatus = "ready" | "pending" | "missing" | "error";

function conversationPath(id?: string): string {
  const base = window.location.pathname === "/conversations" ? "/conversations" : "/";
  return id ? `${base}?conversation=${encodeURIComponent(id)}` : base;
}

function showMobileInbox(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(min-width: 1024px)").matches) return false;
  return !new URLSearchParams(window.location.search).has("conversation");
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

  useLayoutEffect(() => {
    if (!showMobileInbox()) return;
    request.current += 1;
    setSelectedId(undefined);
    setWorkspace(undefined);
    setStatus("ready");
  }, [initialSelectedId, initialWorkspace?.id, initialWorkspace?.deal.id]);

  useEffect(() => {
    request.current += 1;
    if (showMobileInbox()) {
      setSelectedId(undefined);
      setWorkspace(undefined);
      setStatus("ready");
      return;
    }
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

  async function loadWorkspace(id: string, dealId?: string): Promise<ConversationWorkspace | undefined> {
    const query = dealId ? `?deal=${encodeURIComponent(dealId)}` : "";
    const response = await fetch(`/api/crm/conversations/${encodeURIComponent(id)}${query}`);
    if (!response.ok) return undefined;
    const parsed = conversationDetailWireSchema.safeParse(await response.json());
    if (!parsed.success) return undefined;
    return workspaceFromWire(parsed.data);
  }

  async function focusLoadedDeal(dealId: string): Promise<ConversationWorkspace | undefined> {
    const id = selectedId;
    if (!id) return undefined;
    const ticket = request.current + 1;
    request.current = ticket;
    let workspace: ConversationWorkspace | undefined;
    try {
      workspace = await loadWorkspace(id, dealId);
    } catch {
      return undefined;
    }
    if (ticket !== request.current || !workspace) return undefined;
    setWorkspace(workspace);
    setStatus("ready");
    return workspace;
  }

  async function selectConversation(id: string, dealId?: string) {
    if (id === selectedId && (status === "ready" || status === "pending")) return;

    const ticket = request.current + 1;
    request.current = ticket;
    setSelectedId(id);
    setStatus("pending");
    replaceUrl(id);

    let workspace: ConversationWorkspace | undefined;
    try {
      workspace = await loadWorkspace(id, dealId);
    } catch {
      if (ticket !== request.current) return;
      setWorkspace(undefined);
      setStatus("error");
      return;
    }
    if (ticket !== request.current) return;
    setWorkspace(workspace);
    setStatus(workspace ? "ready" : "missing");
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
