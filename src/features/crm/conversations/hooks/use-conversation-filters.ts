"use client";

import { useState } from "react";
import {
  dealStatusOptions,
  defaultIncludedDealStatuses,
} from "@/src/features/crm/deals/utils/status";
import type { DealStatus } from "@/src/features/crm/deals/types";
import type { ConversationInboxItem } from "@/src/features/crm/conversations/types";

const orderedStatuses = dealStatusOptions.map((option) => option.id);

export function useConversationFilters() {
  const [query, setQuery] = useState("");
  const [included, setIncluded] = useState<DealStatus[]>(defaultIncludedDealStatuses);
  const activeCount = included.length === orderedStatuses.length ? 0 : 1;

  function toggleStatus(status: DealStatus) {
    setIncluded((current) => {
      const next = current.includes(status)
        ? current.filter((item) => item !== status)
        : [...current, status];
      return orderedStatuses.filter((item) => next.includes(item));
    });
  }

  function visibleItems(items: ConversationInboxItem[]): ConversationInboxItem[] {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (!included.includes(item.dealStatus)) return false;
      if (!needle) return true;
      return [item.contactName, item.contactPhone, item.contactEmail, item.preview]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }

  return { query, setQuery, included, toggleStatus, activeCount, visibleItems };
}
