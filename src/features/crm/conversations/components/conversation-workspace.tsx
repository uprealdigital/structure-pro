"use client";

import { useMemo, useState } from "react";
import { ConversationDetail } from "@/src/features/crm/conversations/components/conversation-detail";
import { ConversationDetailSkeleton } from "@/src/features/crm/conversations/components/conversation-skeleton";
import { ConversationList } from "@/src/features/crm/conversations/components/conversation-list";
import { useConversationFilters } from "@/src/features/crm/conversations/hooks/use-conversation-filters";
import { useConversationSelection } from "@/src/features/crm/conversations/hooks/use-conversation-selection";
import { copy } from "@/src/features/crm/conversations/locales/en";
import {
  ensureCustomerConversation,
  markDealLost,
  reopenDeal,
  setCustomerActiveDeal,
} from "@/src/features/crm/conversations/server/actions";
import type {
  ConversationInboxItem,
  ConversationParticipant,
  ConversationWorkspace,
} from "@/src/features/crm/conversations/types";
import type { DealStatus } from "@/src/features/crm/deals/types";

function shownInbox(
  items: ConversationInboxItem[],
  statusByDeal: Record<string, DealStatus>,
  activeDealByConversation: Record<string, string>,
): ConversationInboxItem[] {
  return items.map((item) => {
    const dealStatuses = item.dealStatuses.map((deal) => {
      const nextStatus = statusByDeal[deal.id];
      if (!nextStatus || nextStatus === deal.status) return deal;
      return { ...deal, status: nextStatus };
    });
    const dealId = activeDealByConversation[item.id] ?? item.dealId;
    const active = dealStatuses.find((deal) => deal.id === dealId);
    return {
      ...item,
      dealId,
      dealStatus: active?.status ?? item.dealStatus,
      dealStatuses,
    };
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
  const [activeDealByConversation, setActiveDealByConversation] = useState<Record<string, string>>({});
  const [opened, setOpened] = useState<ConversationInboxItem[]>([]);
  const mergedInbox = useMemo(() => {
    const byId = new Map(inbox.map((item) => [item.id, item]));
    for (const item of opened) {
      if (!byId.has(item.id)) byId.set(item.id, item);
    }
    return [...byId.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }, [inbox, opened]);
  const displayed = shownInbox(mergedInbox, statusByDeal, activeDealByConversation);
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

    const stillVisible = filters.visibleItems(shownInbox(mergedInbox, nextPatches, activeDealByConversation)).some(
      (item) => item.id === currentId,
    );
    if (!stillVisible && currentId && index >= 0) {
      const next = before[index + 1] ?? before[index - 1];
      if (next && next.id !== currentId) selectConversation(next.id);
      else selection.clearConversation();
    }
  }

  function activateDeal(dealId: string) {
    const conversationId = selection.selectedId;
    const customerId = selection.workspace?.customer.id;
    if (!conversationId || !customerId) return;
    setActiveDealByConversation((current) => ({ ...current, [conversationId]: dealId }));
    void setCustomerActiveDeal({ customerId, dealId });
  }

  function selectConversation(id: string) {
    void selection.selectConversation(id, activeDealByConversation[id]);
  }

  async function selectCustomer(participant: ConversationParticipant, dealId: string) {
    let conversationId = participant.conversationId;
    if (!conversationId) {
      const result = await ensureCustomerConversation({
        customerId: participant.customer.id,
        dealId,
      });
      if ("error" in result) return;
      conversationId = result.data.item.id;
      const item = result.data.item;
      setOpened((current) => (current.some((row) => row.id === item.id) ? current : [item, ...current]));
    }
    if (!conversationId) return;
    const openedId = conversationId;
    setActiveDealByConversation((current) => ({ ...current, [openedId]: dealId }));
    void selection.selectConversation(openedId, dealId);
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
        onResetFilters={filters.resetFilters}
        dealStatusCount={filters.dealStatusCount}
        activeFilterCount={filters.activeCount}
        selectedId={selection.selectedId}
        onSelect={selectConversation}
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
            key={`${selection.workspace.id}:${selection.workspace.deal.id}`}
            workspace={selection.workspace}
            onBack={selection.clearConversation}
            onMarkLost={onMarkLost}
            onReopen={onReopen}
            onActivateDeal={activateDeal}
            onSelectCustomer={selectCustomer}
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
