"use client";

import { useEffect, useRef, useState } from "react";
import {
  applyConversationSuggestion,
  dismissConversationSuggestion,
  syncConversationSuggestions,
} from "@/src/features/crm/conversations/server/actions";
import type { ConversationSuggestion } from "@/src/features/crm/conversations/types";
import type { InboundMessageRef } from "@/src/features/crm/conversations/utils/inbound-intent";

const requests = new Map<string, Promise<{ success: true; data: ConversationSuggestion[] } | { error: string }>>();

function loadSuggestions(key: string, dealId: string, conversationId: string, positions: number[]) {
  const current = requests.get(key);
  if (current) return current;
  const request = syncConversationSuggestions({ dealId, conversationId, positions }).finally(() => {
    requests.delete(key);
  });
  requests.set(key, request);
  return request;
}

export function useConversationSuggestions(dealId: string, conversationId: string, messages: InboundMessageRef[]) {
  const key = `${dealId}:${messages.map((message) => message.position).join(",")}`;
  const positionsRef = useRef(messages.map((message) => message.position));
  positionsRef.current = messages.map((message) => message.position);
  const hiddenIds = useRef(new Set<string>());
  const [suggestions, setSuggestions] = useState<ConversationSuggestion[]>([]);
  const [trackedKey, setTrackedKey] = useState(key);

  function visible(list: ConversationSuggestion[]) {
    return list.filter((suggestion) => !hiddenIds.current.has(suggestion.id));
  }

  if (trackedKey !== key) {
    setTrackedKey(key);
    setSuggestions([]);
  }

  useEffect(() => {
    if (!dealId || messages.length === 0) return;
    let cancelled = false;
    void loadSuggestions(key, dealId, conversationId, positionsRef.current).then((result) => {
      if (cancelled || "error" in result) return;
      setSuggestions(visible(result.data));
    });
    return () => {
      cancelled = true;
    };
  }, [conversationId, dealId, key, messages.length]);

  function hide(id: string) {
    hiddenIds.current.add(id);
    setSuggestions((current) => current.filter((suggestion) => suggestion.id !== id));
  }

  return {
    suggestions,
    dismiss: (id: string) => {
      const previous = suggestions;
      hide(id);
      void dismissConversationSuggestion({ id }).then((result) => {
        if (!("error" in result)) return;
        hiddenIds.current.delete(id);
        setSuggestions(previous);
      });
    },
    apply: async (id: string) => {
      const previous = suggestions;
      hide(id);
      const result = await applyConversationSuggestion({ id });
      if (!("error" in result)) return;
      hiddenIds.current.delete(id);
      setSuggestions(previous);
    },
  };
}
