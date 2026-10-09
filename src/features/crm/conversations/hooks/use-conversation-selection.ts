"use client";

import { useEffect, useRef, useState } from "react";
import { loadConversationWorkspace } from "@/src/features/crm/conversations/server/actions";
import type { ConversationWorkspace } from "@/src/features/crm/conversations/types";

type SelectionStatus = "ready" | "pending" | "missing" | "error";

function conversationPath(id?: string): string {
  return id ? `/crm/conversations?conversation=${encodeURIComponent(id)}` : "/crm/conversations";
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
  }, [initialSelectedId, initialWorkspace?.id]);

  function replaceUrl(id?: string) {
    window.history.replaceState(window.history.state, "", conversationPath(id));
  }

  async function selectConversation(id: string) {
    if (id === selectedId && (status === "ready" || status === "pending")) return;

    const ticket = request.current + 1;
    request.current = ticket;
    setSelectedId(id);
    setStatus("pending");
    replaceUrl(id);

    const result = await loadConversationWorkspace(id);
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

  return { selectedId, workspace, status, selectConversation, clearConversation };
}
