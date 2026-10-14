"use client";

import { useState } from "react";
import { ConversationDetail } from "@/src/features/crm/conversations/components/conversation-detail";
import { ConversationDetailSkeleton } from "@/src/features/crm/conversations/components/conversation-skeleton";
import { ConversationList } from "@/src/features/crm/conversations/components/conversation-list";
import { useConversationFilters } from "@/src/features/crm/conversations/hooks/use-conversation-filters";
import { useConversationSelection } from "@/src/features/crm/conversations/hooks/use-conversation-selection";
import { copy } from "@/src/features/crm/conversations/locales/en";
import { markDealLost, reopenDeal } from "@/src/features/crm/conversations/server/actions";
import type { ConversationInboxItem, ConversationWorkspace } from "@/src/features/crm/conversations/types";
import type { DealStatus } from "@/src/features/crm/deals/types";

function patchedInbox(
  items: ConversationInboxItem[],
  statusByDeal: Record<string, DealStatus>,
): ConversationInboxItem[] {
  return items.map((item) => {
    let changed = false;
    const dealStatuses = item.dealStatuses.map((deal) => {
      const nextStatus = statusByDeal[deal.id];
      if (!nextStatus || nextStatus === deal.status) return deal;
      changed = true;
      return { ...deal, status: nextStatus };
    });
    if (!changed) return item;
    const primary = dealStatuses.find((deal) => deal.id === item.dealId);
    return { ...item, dealStatus: primary?.status ?? item.dealStatus, dealStatuses };
  });
}

export function ConversationWorkspaceView({
  inbox,
  workspace,
  selectedId,
  loadError,
}: {
  inbox: ConversationInboxItem[];
  workspace?: ConversationWorkspace;
  selectedId?: string;
  loadError: boolean;
}) {
  const selection = useConversationSelection({
    initialSelectedId: selectedId,
    initialWorkspace: workspace,
  });
  const filters = useConversationFilters();
  const [statusByDeal, setStatusByDeal] = useState<Record<string, DealStatus>>({});
  const displayed = patchedInbox(inbox, statusByDeal);
  const visible = filters.visibleItems(displayed);
  const showDetail = Boolean(selection.selectedId);
  const showLoadError = loadError || (showDetail && selection.status === "error");

  function applyDealStatus(dealId: string, nextStatus: DealStatus) {
    const currentId = selection.selectedId;
    const before = filters.visibleItems(displayed);
    const index = before.findIndex((item) => item.id === currentId);
    const nextPatches = { ...statusByDeal, [dealId]: nextStatus };
    setStatusByDeal(nextPatches);
    selection.patchDealStatus(dealId, nextStatus);

    const stillVisible = filters.visibleItems(patchedInbox(inbox, nextPatches)).some(
      (item) => item.id === currentId,
    );
    if (!stillVisible && currentId && index >= 0) {
      const next = before[index + 1] ?? before[index - 1];
      if (next && next.id !== currentId) void selection.selectConversation(next.id);
      else selection.clearConversation();
    }
  }

  async function onMarkLost(dealId: string): Promise<{ success: true } | { error: string }> {
    const result = await markDealLost(dealId);
    if ("error" in result) return result;
    applyDealStatus(dealId, "deal_lost");
    return { success: true };
  }

  async function onReopen(
    dealId: string,
  ): Promise<{ success: true; data: { status: DealStatus } } | { error: string }> {
    const result = await reopenDeal(dealId);
    if ("error" in result) return result;
    applyDealStatus(dealId, result.data.status);
    return result;
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 self-stretch overflow-hidden">
      <ConversationList
        items={visible}
        inboxEmpty={displayed.length === 0}
        query={filters.query}
        onQueryChange={filters.setQuery}
        includedStatuses={filters.included}
        onToggleStatus={filters.toggleStatus}
        onClearFilters={filters.clearFilters}
        dealStatusCount={filters.dealStatusCount}
        activeFilterCount={filters.activeCount}
        selectedId={selection.selectedId}
        onSelect={selection.selectConversation}
      />
      <section
        className={`${showDetail ? "flex" : "hidden lg:flex"} min-h-0 min-w-0 flex-1 flex-col`}
      >
        {showLoadError ? (
          <div className="flex flex-1 items-center justify-center px-6">
            <p className="text-sm text-gray-500">{copy.loadError}</p>
          </div>
        ) : selection.workspace && selection.status !== "pending" ? (
          <ConversationDetail
            key={selection.workspace.id}
            workspace={selection.workspace}
            onBack={selection.clearConversation}
            onMarkLost={onMarkLost}
            onReopen={onReopen}
            onSelectConversation={selection.highlightConversation}
          />
        ) : showDetail && selection.status === "pending" ? (
          <ConversationDetailSkeleton />
        ) : showDetail ? (
          <div className="flex flex-1 items-center justify-center px-6">
            <p className="text-sm text-gray-500">{copy.missingConversation}</p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <h2 className="font-serif text-2xl font-semibold text-gray-950">{copy.selectConversation}</h2>
            <p className="mt-2 max-w-sm text-sm leading-5 text-gray-500">
              {copy.selectConversationBody}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
