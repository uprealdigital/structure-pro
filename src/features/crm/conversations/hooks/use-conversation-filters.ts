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
  const [included, setIncluded] = useState<DealStatus[]>([...defaultIncludedDealStatuses]);
  const dealStatusCount = orderedStatuses.length - included.length;
  const activeCount = dealStatusCount;

  function toggleStatus(status: DealStatus) {
    setIncluded((current) => {
      const next = current.includes(status)
        ? current.filter((item) => item !== status)
        : [...current, status];
      return orderedStatuses.filter((item) => next.includes(item));
    });
  }

  function clearFilters() {
    setIncluded([...defaultIncludedDealStatuses]);
  }

  function visibleItems(items: ConversationInboxItem[]): ConversationInboxItem[] {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      const statuses =
        item.dealStatuses.length > 0 ? item.dealStatuses.map((deal) => deal.status) : [item.dealStatus];
      if (!statuses.some((status) => included.includes(status))) return false;
      if (!needle) return true;
      return [item.contactName, item.contactPhone, item.contactEmail, item.preview]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }

  return {
    query,
    setQuery,
    included,
    toggleStatus,
    clearFilters,
    dealStatusCount,
    activeCount,
    visibleItems,
  };
}
