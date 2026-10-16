"use client";

import { useEffect, useRef } from "react";
import { activityEventSchema, type ActivityEvent } from "@/src/features/crm/conversations/types";

const reconnectDelayMs = 1000;

export function useActivityStream(onEvent: (event: ActivityEvent) => void, initialSince?: string) {
  const onEventRef = useRef(onEvent);
  const sinceRef = useRef(initialSince);

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
      const since = sinceRef.current;
      const url = since
        ? `/api/crm/conversations/events?since=${encodeURIComponent(since)}`
        : "/api/crm/conversations/events";
      source = new EventSource(url);
      source.onmessage = (message) => {
        let payload: unknown;
        try {
          payload = JSON.parse(message.data);
        } catch {
          return;
        }
        const parsed = activityEventSchema.safeParse(payload);
        if (!parsed.success) return;
        const event = parsed.data;
        const key = `${event.conversationId}:${event.activity.position}`;
        if (seen.has(key)) return;
        seen.add(key);
        const createdAt = event.activity.createdAt;
        if (createdAt && (!sinceRef.current || createdAt > sinceRef.current)) sinceRef.current = createdAt;
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
  }, []);
}
