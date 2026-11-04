"use client";

import { useEffect, useState } from "react";
import { ConversationSkeleton } from "@/src/features/crm/conversations/components/conversation-skeleton";
import { ConversationWorkspaceView } from "@/src/features/crm/conversations/components/conversation-workspace";
import {
  conversationIndexResponseSchema,
  type ConversationInboxItem,
  type ConversationWorkspace,
} from "@/src/features/crm/conversations/types";
import { inboxItemFromWire, workspaceFromWire } from "@/src/features/crm/conversations/utils/wire";
import { copy } from "@/src/features/crm/conversations/locales/en";

function searchValue(name: string): string | undefined {
  const value = new URLSearchParams(window.location.search).get(name)?.trim();
  return value ? value : undefined;
}

export function ConversationScreen() {
  const [inbox, setInbox] = useState<ConversationInboxItem[]>([]);
  const [workspace, setWorkspace] = useState<ConversationWorkspace>();
  const [selectedId, setSelectedId] = useState<string>();
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ autoSelect: "first" });
    const conversationId = searchValue("conversation");
    const dealId = searchValue("deal");
    if (conversationId) params.set("conversation", conversationId);
    if (dealId) params.set("deal", dealId);
    void fetch(`/api/crm/conversations?${params.toString()}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("load");
        return response.json();
      })
      .then((payload) => {
        if (cancelled) return;
        const parsed = conversationIndexResponseSchema.safeParse(payload);
        if (!parsed.success) throw new Error("load");
        const items = parsed.data.conversations.flatMap((item) => {
          const inboxItem = inboxItemFromWire(item);
          return inboxItem ? [inboxItem] : [];
        });
        const open = parsed.data.conversation ? workspaceFromWire(parsed.data.conversation) : undefined;
        setInbox(items);
        setWorkspace(open);
        setSelectedId(open?.id ?? items.find((item) => item.dealStatus !== "deal_lost")?.id);
        setLoadError(false);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <ConversationSkeleton />;
  if (loadError && inbox.length === 0) {
    return (
      <main className="flex min-h-0 flex-1 items-center justify-center bg-[#f9f9fb] px-6">
        <p className="text-sm text-gray-500">{copy.loadError}</p>
      </main>
    );
  }

  return (
    <ConversationWorkspaceView
      inbox={inbox}
      workspace={workspace}
      selectedId={selectedId}
      loadError={loadError}
    />
  );
}
