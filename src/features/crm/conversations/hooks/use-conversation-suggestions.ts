"use client";

import { useEffect, useRef, useState } from "react";
import type { SuggestionIntent } from "@/src/features/ai/types";
import {
  applyConversationSuggestion,
  dismissConversationSuggestion,
  restoreConversationSuggestion,
} from "@/src/features/crm/conversations/server/actions";
import {
  suggestionStreamEventSchema,
  type ConversationSuggestion,
  type SuggestionStreamEvent,
} from "@/src/features/crm/conversations/types";
import type { ConfigChanges } from "@/src/features/crm/quotes/types";
import type { InboundMessageRef } from "@/src/features/crm/conversations/utils/inbound-intent";

export type SuggestionStreaming = {
  revision: { configChanges: ConfigChanges; partial: boolean } | null;
  quote: { partial: boolean } | null;
};

type SuggestionRun = {
  controller: AbortController;
  revision: SuggestionStreaming["revision"];
  quote: SuggestionStreaming["quote"];
  suggestions: ConversationSuggestion[] | null;
  listeners: Set<() => void>;
};

const runs = new Map<string, SuggestionRun>();

function notify(run: SuggestionRun) {
  for (const listener of run.listeners) listener();
}

function applyStreamEvent(run: SuggestionRun, event: SuggestionStreamEvent) {
  if (event.type === "intent") {
    if (event.intent === "revision") {
      run.revision = { configChanges: run.revision?.configChanges ?? {}, partial: event.partial };
    } else {
      run.quote = { partial: event.partial };
    }
  } else if (event.type === "changes") {
    run.revision = { configChanges: event.configChanges, partial: event.partial };
  } else if (event.type === "done") {
    run.suggestions = event.suggestions;
    run.revision = null;
    run.quote = null;
  } else {
    run.revision = null;
    run.quote = null;
  }
  notify(run);
}

async function readSuggestionStream(
  dealId: string,
  conversationId: string,
  positions: number[],
  signal: AbortSignal,
  run: SuggestionRun,
) {
  const response = await fetch("/api/crm/conversations/suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dealId, conversationId, positions }),
    signal,
  });
  if (!response.ok || !response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    if (done) buffer += "\n";
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = suggestionStreamEventSchema.safeParse(JSON.parse(trimmed));
        if (parsed.success) applyStreamEvent(run, parsed.data);
      } catch {
        // Ignore a line that is not JSON.
      }
    }
    if (done) break;
  }
}

function startSuggestionRun(key: string, dealId: string, conversationId: string, positions: number[]) {
  const existing = runs.get(key);
  if (existing) return existing;
  for (const [other, run] of runs) {
    if (other === key) continue;
    run.controller.abort();
    runs.delete(other);
  }
  const controller = new AbortController();
  const run: SuggestionRun = {
    controller,
    revision: null,
    quote: null,
    suggestions: null,
    listeners: new Set(),
  };
  runs.set(key, run);
  void readSuggestionStream(dealId, conversationId, positions, controller.signal, run)
    .catch(() => {
      if (controller.signal.aborted) return;
      run.revision = null;
      run.quote = null;
      notify(run);
    })
    .finally(() => {
      if (runs.get(key) === run) runs.delete(key);
    });
  return run;
}

const emptyStreaming: SuggestionStreaming = { revision: null, quote: null };

export function useConversationSuggestions(dealId: string, conversationId: string, messages: InboundMessageRef[]) {
  const key = `${dealId}:${messages.map((message) => message.position).join(",")}`;
  const positionsRef = useRef(messages.map((message) => message.position));
  positionsRef.current = messages.map((message) => message.position);
  const hiddenIds = useRef(new Set<string>());
  const dismissedIntents = useRef(new Set<SuggestionIntent>());
  const dismissedSaved = useRef(new Set<string>());
  const [suggestions, setSuggestions] = useState<ConversationSuggestion[]>([]);
  const [streaming, setStreaming] = useState<SuggestionStreaming>(emptyStreaming);
  const [trackedKey, setTrackedKey] = useState(key);

  function visible(list: ConversationSuggestion[]) {
    return list.filter((suggestion) => !hiddenIds.current.has(suggestion.id) && !dismissedIntents.current.has(suggestion.intent));
  }

  if (trackedKey !== key) {
    setTrackedKey(key);
    setSuggestions([]);
    setStreaming(emptyStreaming);
    dismissedIntents.current.clear();
    dismissedSaved.current.clear();
  }

  useEffect(() => {
    if (!dealId || messages.length === 0) return;
    const run = startSuggestionRun(key, dealId, conversationId, positionsRef.current);
    let cancelled = false;
    const publish = () => {
      if (cancelled) return;
      if (run.suggestions) {
        for (const suggestion of run.suggestions) {
          if (!dismissedIntents.current.has(suggestion.intent) || dismissedSaved.current.has(suggestion.id)) continue;
          dismissedSaved.current.add(suggestion.id);
          hiddenIds.current.add(suggestion.id);
          void dismissConversationSuggestion({ id: suggestion.id });
        }
        setSuggestions(visible(run.suggestions));
        setStreaming(emptyStreaming);
        return;
      }
      setStreaming({
        revision: dismissedIntents.current.has("revision") ? null : run.revision,
        quote: dismissedIntents.current.has("new_quote") ? null : run.quote,
      });
    };
    run.listeners.add(publish);
    publish();
    return () => {
      cancelled = true;
      run.listeners.delete(publish);
    };
  }, [conversationId, dealId, key, messages.length]);

  function hide(id: string) {
    hiddenIds.current.add(id);
    setSuggestions((current) => current.filter((suggestion) => suggestion.id !== id));
  }

  return {
    suggestions,
    streaming,
    dismissStreaming: (intent: SuggestionIntent) => {
      dismissedIntents.current.add(intent);
      setStreaming((current) => ({
        revision: intent === "revision" ? null : current.revision,
        quote: intent === "new_quote" ? null : current.quote,
      }));
    },
    dismiss: async (id: string) => {
      const previous = suggestions;
      hide(id);
      const result = await dismissConversationSuggestion({ id });
      if (!("error" in result)) return true;
      hiddenIds.current.delete(id);
      setSuggestions(previous);
      return false;
    },
    restore: async (suggestion: ConversationSuggestion) => {
      const result = await restoreConversationSuggestion({ id: suggestion.id });
      if ("error" in result) return false;
      hiddenIds.current.delete(suggestion.id);
      dismissedIntents.current.delete(suggestion.intent);
      setSuggestions((current) => {
        if (current.some((item) => item.id === suggestion.id)) return current;
        return [...current, suggestion].sort(
          (left, right) => Number(left.intent === "new_quote") - Number(right.intent === "new_quote"),
        );
      });
      return true;
    },
    apply: async (id: string) => {
      const previous = suggestions;
      hide(id);
      const result = await applyConversationSuggestion({ id });
      if (!("error" in result)) return;
      hiddenIds.current.delete(id);
      setSuggestions(previous);
    },
    rememberPreview: (id: string, previewImageUrl: string) => {
      setSuggestions((current) =>
        current.map((suggestion) => (suggestion.id === id ? { ...suggestion, previewImageUrl } : suggestion)),
      );
    },
  };
}
