"use client";

import { useEffect, useRef } from "react";
import { dealChangeEventSchema, type DealChangeEvent } from "@/src/features/crm/deals/types";

const reconnectDelayMs = 1000;

export function useDealStream(onEvent: (event: DealChangeEvent) => void, dealId?: string) {
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
      const url = dealId
        ? `/api/crm/deals/events?dealId=${encodeURIComponent(dealId)}`
        : "/api/crm/deals/events";
      source = new EventSource(url);
      source.onmessage = (message) => {
        let payload: unknown;
        try {
          payload = JSON.parse(message.data);
        } catch {
          return;
        }
        const parsed = dealChangeEventSchema.safeParse(payload);
        if (!parsed.success) return;
        const event = parsed.data;
        const key = `${event.kind}:${event.id}:${event.status ?? ""}:${event.updatedAt ?? ""}`;
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
  }, [dealId]);
}
