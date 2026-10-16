"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { markVisibleActivitiesRead } from "@/src/features/crm/conversations/server/actions";
import type { Activity } from "@/src/features/crm/conversations/types";

const readDelayMs = 500;
const visibleShare = 0.25;

function activityIsVisible(entry: IntersectionObserverEntry) {
  if (!entry.isIntersecting) return false;
  if (entry.intersectionRatio >= visibleShare) return true;
  const rootHeight = entry.rootBounds?.height ?? 0;
  return rootHeight > 0 && entry.intersectionRect.height >= Math.min(48, rootHeight * 0.5);
}

export function useVisibleActivityReads({
  rootRef,
  conversationId,
  activitiesRef,
  onRead,
}: {
  rootRef: RefObject<HTMLElement | null>;
  conversationId: string;
  activitiesRef: RefObject<Activity[]>;
  onRead: (update: { positions: number[]; readAt: string; unreadCount: number }) => void;
}) {
  const onReadRef = useRef(onRead);
  const suppress = useRef(new Set<number>());
  onReadRef.current = onRead;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const pane: HTMLElement = root;
    suppress.current.clear();

    const timers = new Map<number, number>();
    const inflight = new Set<number>();
    const visible = new Set<number>();
    let batch: number[] = [];
    let batchTimer: number | undefined;
    let stopped = false;

    function clearTimer(position: number) {
      const timer = timers.get(position);
      if (timer == null) return;
      window.clearTimeout(timer);
      timers.delete(position);
    }

    function startTimer(position: number) {
      if (timers.has(position) || inflight.has(position) || suppress.current.has(position)) return;
      const activity = activitiesRef.current.find((item) => item.position === position);
      if (!activity || activity.read) return;
      timers.set(
        position,
        window.setTimeout(() => {
          timers.delete(position);
          const current = activitiesRef.current.find((item) => item.position === position);
          if (!current || current.read || suppress.current.has(position) || !visible.has(position)) return;
          inflight.add(position);
          batch.push(position);
          window.clearTimeout(batchTimer);
          batchTimer = window.setTimeout(flush, 50);
        }, readDelayMs),
      );
    }

    function flush() {
      const positions = [...new Set(batch)];
      batch = [];
      if (positions.length === 0 || stopped) return;
      void markVisibleActivitiesRead({ conversationId, positions }).then((result) => {
        for (const position of positions) inflight.delete(position);
        if (stopped) return;
        if ("error" in result) {
          for (const position of positions) {
            if (visible.has(position)) startTimer(position);
          }
          return;
        }
        const positionsToApply = positions.filter((position) => !suppress.current.has(position));
        if (positionsToApply.length === 0) return;
        onReadRef.current({
          positions: positionsToApply,
          readAt: result.data.readAt,
          unreadCount: result.data.unreadCount,
        });
      });
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const position = Number((entry.target as HTMLElement).dataset.activityPosition);
          if (!Number.isInteger(position)) continue;
          if (!activityIsVisible(entry)) {
            visible.delete(position);
            suppress.current.delete(position);
            clearTimer(position);
            continue;
          }
          visible.add(position);
          startTimer(position);
        }
      },
      { root: pane, threshold: [0, 0.1, 0.25, 0.5, 1] },
    );

    function observe() {
      pane.querySelectorAll<HTMLElement>("[data-activity-position]").forEach((node) => observer.observe(node));
    }

    observe();
    const changes = new MutationObserver(observe);
    changes.observe(pane, { childList: true, subtree: true });

    return () => {
      stopped = true;
      window.clearTimeout(batchTimer);
      for (const timer of timers.values()) window.clearTimeout(timer);
      observer.disconnect();
      changes.disconnect();
    };
  }, [activitiesRef, conversationId, rootRef]);

  return useCallback((position: number) => {
    suppress.current.add(position);
  }, []);
}