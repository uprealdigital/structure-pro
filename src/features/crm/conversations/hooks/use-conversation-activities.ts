"use client";

import { useEffect, useState } from "react";
import { loadConversationWorkspace } from "@/src/features/crm/conversations/server/actions";
import type { Activity } from "@/src/features/crm/conversations/types";

const REFRESH_MS = 4000;

function sameActivities(left: Activity[], right: Activity[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((activity, index) => {
    const other = right[index];
    return (
      activity.role === other.role &&
      activity.channel === other.channel &&
      activity.text === other.text &&
      activity.generatedBy === other.generatedBy &&
      activity.createdAt === other.createdAt
    );
  });
}

export function useConversationActivities(conversationId: string, initial: Activity[]) {
  const [activities, setActivities] = useState(initial);
  const [trackedId, setTrackedId] = useState(conversationId);
  if (trackedId !== conversationId) {
    setTrackedId(conversationId);
    setActivities(initial);
  }

  useEffect(() => {
    if (!conversationId) return;

    let cancelled = false;

    async function refresh() {
      const result = await loadConversationWorkspace(conversationId);
      if (cancelled || "error" in result || !result.data) return;
      const next = result.data.activities;
      setActivities((current) => {
        if (sameActivities(current, next)) return current;
        const serverHasLocalMessages =
          next.length < current.length &&
          next.every((activity, index) => {
            const local = current[index];
            return (
              local != null &&
              activity.role === local.role &&
              activity.channel === local.channel &&
              activity.text === local.text &&
              activity.generatedBy === local.generatedBy &&
              activity.createdAt === local.createdAt
            );
          });
        return serverHasLocalMessages ? current : next;
      });
    }

    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [conversationId]);

  return { activities, setActivities };
}
