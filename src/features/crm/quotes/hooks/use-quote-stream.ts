"use client";

import { useEffect, useRef } from "react";
import { quoteChangeEventSchema, type QuoteChangeEvent } from "@/src/features/crm/quotes/types";

const reconnectDelayMs = 1000;

export function useQuoteStream(onEvent: (event: QuoteChangeEvent) => void, quoteId?: string) {
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    const seen = new Set<string>();
    let source: EventSource | undefined;
    let timer: number | undefined;
    let stopped = false;

    function connect() {
      if (stopped) return;
      const url = quoteId
        ? `/api/crm/quotes/events?quoteId=${encodeURIComponent(quoteId)}`
        : "/api/crm/quotes/events";
      source = new EventSource(url);
      source.onmessage = (message) => {
        let payload: unknown;
        try {
          payload = JSON.parse(message.data);
        } catch {
          return;
        }
        const parsed = quoteChangeEventSchema.safeParse(payload);
        if (!parsed.success) return;
        const event = parsed.data;
        const key = `${event.kind}:${event.id}:${event.status ?? ""}:${event.activeRevisionId ?? ""}:${event.updatedAt ?? ""}`;
        if (seen.has(key)) return;
        seen.add(key);
        onEventRef.current(event);
      };
      source.onerror = () => {
        source?.close();
        source = undefined;
        if (!stopped) timer = window.setTimeout(connect, reconnectDelayMs);
      };
    }

    connect();
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      source?.close();
    };
  }, [quoteId]);
}
