"use client";

import { useState } from "react";
import type { Activity } from "@/src/features/crm/conversations/types";

function withIncoming(current: Activity[], incoming: Activity[]): Activity[] {
  const seen = new Set(current.map((activity) => activity.position));
  const added = incoming.filter((activity) => !seen.has(activity.position));
  if (added.length === 0) return current;
  return [...current, ...added].sort((left, right) => left.position - right.position);
}

export function useConversationActivities(
  conversationId: string,
  initial: Activity[],
  incoming: Activity[] = [],
) {
  const [activities, setActivities] = useState(initial);
  const [trackedId, setTrackedId] = useState(conversationId);
  const incomingKey = incoming.map((activity) => activity.position).join(",");
  const [seenKey, setSeenKey] = useState(incomingKey);

  if (trackedId !== conversationId) {
    setTrackedId(conversationId);
    setSeenKey(incomingKey);
    setActivities(withIncoming(initial, incoming));
  } else if (seenKey !== incomingKey) {
    setSeenKey(incomingKey);
    setActivities((current) => withIncoming(current, incoming));
  }

  return { activities, setActivities };
}
