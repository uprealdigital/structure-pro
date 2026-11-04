"use client";

import { useState } from "react";
import {
  dealStatusOptions,
  defaultIncludedDealStatuses,
} from "@/src/features/crm/deals/utils/status";
import type { DealStatus } from "@/src/features/crm/deals/types";
import type { ConversationListItem } from "@/src/features/crm/conversations/types";

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
    setIncluded([...orderedStatuses]);
  }

  function resetFilters() {
    setIncluded([...defaultIncludedDealStatuses]);
  }

  function selectAllStatuses() {
    setIncluded([...orderedStatuses]);
  }

  function deselectAllStatuses() {
    setIncluded([]);
  }

  function visibleItems(
    items: ConversationListItem[],
    statusOf: (item: ConversationListItem) => DealStatus | undefined,
    textOf: (item: ConversationListItem) => string,
  ): ConversationListItem[] {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      const status = statusOf(item);
      if (!status || !included.includes(status)) return false;
      if (!needle) return true;
      const customer = item.customer;
      return [customer.full_name, customer.phone, customer.email, textOf(item)]
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
    resetFilters,
    selectAllStatuses,
    deselectAllStatuses,
    dealStatusCount,
    activeCount,
    visibleItems,
  };
}
