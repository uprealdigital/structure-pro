"use client";

import { useState } from "react";
import type { Activity } from "@/src/features/crm/conversations/types";

export function useConversationActivities(conversationId: string, initial: Activity[]) {
  const [activities, setActivities] = useState(initial);
  const [trackedId, setTrackedId] = useState(conversationId);
  if (trackedId !== conversationId) {
    setTrackedId(conversationId);
    setActivities(initial);
  }

  return { activities, setActivities };
}
