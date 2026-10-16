"use client";

import { useMemo, useRef, useState } from "react";
import { ConversationDetail, type ThreadReadNotice } from "@/src/features/crm/conversations/components/conversation-detail";
import { ConversationDetailSkeleton } from "@/src/features/crm/conversations/components/conversation-skeleton";
import { ConversationList } from "@/src/features/crm/conversations/components/conversation-list";
import { useActivityStream } from "@/src/features/crm/conversations/hooks/use-activity-stream";
import { useConversationFilters } from "@/src/features/crm/conversations/hooks/use-conversation-filters";
import { useConversationSelection } from "@/src/features/crm/conversations/hooks/use-conversation-selection";
import { copy } from "@/src/features/crm/conversations/locales/en";
import {
  ensureCustomerConversation,
  loadConversationInboxItem,
  markConversationsRead,
  markDealLost,
  renameDeal,
  reopenDeal,
  setCustomerActiveDeal,
} from "@/src/features/crm/conversations/server/actions";
import type {
  Activity,
  ActivityEvent,
  ActivityReadEvent,
  ConversationInboxItem,
  ConversationParticipant,
  ConversationWorkspace,
} from "@/src/features/crm/conversations/types";
import { activityPreview, messageActivityAt } from "@/src/features/crm/conversations/utils/formatting";
import type { DealStatus } from "@/src/features/crm/deals/types";

type InboxPatch = {
  position: number;
  preview: string;
  updatedAt?: string;
};

function newestActivityAt(inbox: ConversationInboxItem[], workspace?: ConversationWorkspace): string | undefined {
  let latest = "";
  for (const item of inbox) {
    if (item.updatedAt > latest) latest = item.updatedAt;
  }
  for (const activity of workspace?.activities ?? []) {
    if (activity.createdAt && activity.createdAt > latest) latest = activity.createdAt;
  }
  return latest || undefined;
}

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
  const [arrived, setArrived] = useState<ConversationInboxItem[]>([]);
  const [patches, setPatches] = useState<Record<string, InboxPatch>>({});
  const [unreadCountById, setUnreadCountById] = useState<Record<string, number>>({});
  const serverUnreadCount = useRef(new Map<string, number>());
  const [liveActivities, setLiveActivities] = useState<Record<string, Activity[]>>({});
  const [readNotice, setReadNotice] = useState<ThreadReadNotice | null>(null);
  const readToken = useRef(0);
  const knownIds = useRef(new Set<string>());
  const requestedIds = useRef(new Set<string>());
  for (const item of inbox) {
    knownIds.current.add(item.id);
    serverUnreadCount.current.set(item.id, item.unreadCount);
  }
  for (const item of opened) {
    knownIds.current.add(item.id);
    serverUnreadCount.current.set(item.id, item.unreadCount);
  }
  for (const item of arrived) {
    knownIds.current.add(item.id);
    serverUnreadCount.current.set(item.id, item.unreadCount);
  }

  useActivityStream(
    (event) => {
      applyActivity(event);
    },
    (event) => {
      applyRead(event);
    },
    newestActivityAt(inbox, workspace),
  );

  function applyActivity(event: ActivityEvent) {
    const { conversationId, activity } = event;
    setLiveActivities((current) => {
      const list = current[conversationId] ?? [];
      if (list.some((item) => item.position === activity.position)) return current;
      return { ...current, [conversationId]: [...list, activity] };
    });
    setPatches((current) => {
      const previous = current[conversationId];
      if (previous && previous.position >= activity.position) return current;
      const stamped = messageActivityAt(activity);
      return {
        ...current,
        [conversationId]: {
          position: activity.position,
          preview: activityPreview(activity),
          updatedAt: stamped ?? previous?.updatedAt,
        },
      };
    });
    if (!activity.read && knownIds.current.has(conversationId)) {
      setUnreadCountById((current) => {
        const base = current[conversationId] ?? serverUnreadCount.current.get(conversationId) ?? 0;
        return { ...current, [conversationId]: base + 1 };
      });
    }
    if (knownIds.current.has(conversationId) || requestedIds.current.has(conversationId)) return;
    requestedIds.current.add(conversationId);
    void loadConversationInboxItem(conversationId).then((result) => {
      if ("error" in result || !result.data) return;
      const item = result.data;
      knownIds.current.add(item.id);
      setArrived((current) => (current.some((row) => row.id === item.id) ? current : [...current, item]));
    });
  }

  function applyRead(event: ActivityReadEvent) {
    setUnreadCountById((current) => ({ ...current, [event.conversationId]: event.unreadCount }));
    setLiveActivities((current) => {
      const list = current[event.conversationId];
      if (!list) return current;
      return {
        ...current,
        [event.conversationId]: list.map((activity) =>
          activity.position === event.position
            ? { ...activity, read: event.readAt != null, readAt: event.readAt }
            : activity,
        ),
      };
    });
    setReadNotice({
      token: readToken.current + 1,
      kind: "activity",
      conversationId: event.conversationId,
      position: event.position,
      readAt: event.readAt,
    });
    readToken.current += 1;
  }

  const mergedInbox = useMemo(() => {
    const byId = new Map(inbox.map((item) => [item.id, item]));
    for (const item of opened) {
      if (!byId.has(item.id)) byId.set(item.id, item);
    }
    for (const item of arrived) {
      if (!byId.has(item.id)) byId.set(item.id, item);
    }
    for (const [id, patch] of Object.entries(patches)) {
      const existing = byId.get(id);
      if (!existing) continue;
      byId.set(id, {
        ...existing,
        preview: patch.preview,
        updatedAt: patch.updatedAt ?? existing.updatedAt,
      });
    }
    return [...byId.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }, [inbox, opened, arrived, patches]);
  const displayed = shownInbox(mergedInbox, statusByDeal, activeDealByConversation);
  const visible = filters.visibleItems(displayed).map((item) => {
    const count = unreadCountById[item.id];
    if (count === undefined) return item;
    return { ...item, unreadCount: count, unread: count > 0 };
  });
  const showDetail = Boolean(selection.selectedId);
  const showLoadError = loadError || (showDetail && selection.status === "error");

  async function markRead(ids: string[], read: boolean) {
    if (ids.length === 0) return;
    const snapshot = new Map(ids.map((id) => [id, unreadCountById[id]]));
    setUnreadCountById((current) => {
      const next = { ...current };
      for (const id of ids) {
        if (read) {
          next[id] = 0;
          continue;
        }
        const base = current[id] ?? serverUnreadCount.current.get(id) ?? 0;
        next[id] = base === 0 ? 1 : base;
      }
      return next;
    });
    const result = await markConversationsRead({ conversationIds: ids, read });
    if ("error" in result) {
      setUnreadCountById((current) => {
        const next = { ...current };
        for (const [id, value] of snapshot) {
          if (value === undefined) delete next[id];
          else next[id] = value;
        }
        return next;
      });
      return;
    }
    const returned = new Map(result.data.counts.map((row) => [row.conversationId, row.unreadCount]));
    setUnreadCountById((current) => {
      const next = { ...current };
      for (const [id, unreadCount] of returned) next[id] = unreadCount;
      if (!read) {
        for (const id of ids) {
          if (!returned.has(id)) next[id] = 0;
        }
      }
      return next;
    });
    const conversationIds = read ? ids : [...returned.keys()];
    if (conversationIds.length === 0) return;
    readToken.current += 1;
    setReadNotice({
      token: readToken.current,
      kind: "conversations",
      conversationIds,
      read,
    });
  }

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

  async function onRename(dealId: string, name: string) {
    return renameDeal({ dealId, name });
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
        onSelectAllStatuses={filters.selectAllStatuses}
        onDeselectAllStatuses={filters.deselectAllStatuses}
        dealStatusCount={filters.dealStatusCount}
        activeFilterCount={filters.activeCount}
        selectedId={selection.selectedId}
        onSelect={selectConversation}
        onMarkRead={(ids, read) => {
          void markRead(ids, read);
        }}
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
            incoming={liveActivities[selection.workspace.id] ?? []}
            onBack={selection.clearConversation}
            onMarkLost={onMarkLost}
            onRename={onRename}
            onReopen={onReopen}
            onActivateDeal={activateDeal}
            onSelectCustomer={selectCustomer}
            onActivitiesSeen={(id, unreadCount) => {
              setUnreadCountById((current) => ({ ...current, [id]: unreadCount }));
            }}
            readNotice={readNotice}
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
