"use client";

import { ArrowUpRight, Paperclip, Pencil, Phone, Plus, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { BuildingConfigurator } from "@/src/features/cpq/components/building-configurator";
import { activityChannelLabel, ConversationThread } from "@/src/features/crm/conversations/components/conversation-thread";
import { CustomerMenu } from "@/src/features/crm/conversations/components/customer-menu";
import { DealHeading } from "@/src/features/crm/conversations/components/deal-menu";
import { DealSummary } from "@/src/features/crm/conversations/components/deal-summary";
import { QuotePanel, QuoteRevisionMenu } from "@/src/features/crm/conversations/components/quote-panel";
import { Toast } from "@/src/common/components/toast";
import { ReviewSendModal } from "@/src/features/crm/conversations/components/review-send-modal";
import { useConversationActivities } from "@/src/features/crm/conversations/hooks/use-conversation-activities";
import { useVisibleActivityReads } from "@/src/features/crm/conversations/hooks/use-visible-activity-reads";
import { copy } from "@/src/features/crm/conversations/locales/en";
import { sendConversationQuote, sendManualActivity } from "@/src/features/crm/conversations/server/actions";
import type {
  Activity,
  ComposerChannel,
  ConversationParticipant,
  ConversationQuote,
  ConversationQuoteRevision,
  ConversationWorkspace,
} from "@/src/features/crm/conversations/types";
import { productTitle, revisionVersionLabel } from "@/src/features/crm/conversations/utils/formatting";
import {
  conversationQuoteFromSelections,
  conversationQuoteWithActiveRevision,
  conversationQuoteWithSentRevision,
} from "@/src/features/crm/conversations/utils/mappers";
import { activateQuoteRevision, saveQuoteSelections } from "@/src/features/crm/quotes/server/actions";
import type { QuoteSelections } from "@/src/features/cpq/types";
import { DealStatusBadge } from "@/src/features/crm/deals/components/deal-status-badge";
import { dealNameMaxLength, type DealStatus } from "@/src/features/crm/deals/types";
import { participantsForDeal } from "@/src/features/crm/conversations/utils/participants";

function ChannelIcon({ channel, className }: { channel: ComposerChannel; className?: string }) {
  const iconClass = className ?? "h-3.5 w-3.5 shrink-0";
  if (channel === "telegram") {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M21.94 4.32 18.7 19.72c-.24 1.08-.89 1.34-1.8.84l-4.97-3.66-2.4 2.31c-.26.27-.49.49-1 .49l.36-5.07 9.22-8.33c.4-.36-.09-.56-.62-.2L6.2 12.96l-4.9-1.53c-1.07-.33-1.09-1.07.22-1.58L20.4 3.1c.89-.33 1.66.2 1.54 1.22Z" />
      </svg>
    );
  }
  if (channel === "sms") {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M5 3h14a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H10l-5 4v-4H5a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z" />
      </svg>
    );
  }
  if (channel === "facebook") {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M14.5 8H17V4.5h-2.5C11.6 4.5 9.5 6.6 9.5 9.5V12H7v3.5h2.5V22h3.5v-6.5H16l.7-3.5h-3.7V9.5c0-.8.7-1.5 1.5-1.5Z" />
      </svg>
    );
  }
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 6.2A2.2 2.2 0 0 1 5.2 4h13.6A2.2 2.2 0 0 1 21 6.2v.3l-9 5.6L3 6.5v-.3Zm0 2.7V17.8A2.2 2.2 0 0 0 5.2 20h13.6a2.2 2.2 0 0 0 2.2-2.2V8.9l-8.4 5.2a1.2 1.2 0 0 1-1.2 0L3 8.9Z" />
    </svg>
  );
}

export type ThreadReadNotice =
  | {
      token: number;
      kind: "activity";
      conversationId: string;
      position: number;
      readAt: string | null;
    }
  | {
      token: number;
      kind: "conversations";
      conversationIds: string[];
      read: boolean;
    };

function revisionStatusLabel(revision: ConversationQuoteRevision): string {
  return revisionVersionLabel(revision.status, revision.revisionNumber);
}

function viewedRevision(
  quote: ConversationQuote | null,
  selectedRevisionId: string | null,
): ConversationQuoteRevision | null {
  if (!quote) return null;
  return (
    quote.revisions.find((revision) => revision.id === selectedRevisionId) ??
    quote.revisions.find((revision) => revision.id === quote.activeRevisionId) ??
    quote.revisions[0] ??
    null
  );
}

function DetailsToggle({
  open,
  onClick,
}: {
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={open ? copy.hideDetails : copy.seeDetails}
      aria-label={open ? copy.hideDetails : copy.seeDetails}
      aria-expanded={open}
      onClick={onClick}
      className="pointer-events-auto inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-transparent px-3 py-1 text-xs leading-none font-medium text-gray-500 transition-colors hover:bg-gray-100/70 hover:text-gray-900 focus:outline-none"
    >
        <span>{open ? copy.hideDetails : copy.seeDetails}</span>
        <svg
          className={`h-3 w-3 shrink-0 text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    </button>
  );
}

export function ConversationDetail({
  workspace,
  incoming = [],
  onBack,
  onMarkLost,
  onReopen,
  onRename,
  onActivateDeal,
  onSelectCustomer,
  onActivitiesSeen,
  readNotice = null,
}: {
  workspace: ConversationWorkspace;
  incoming?: Activity[];
  onBack: () => void;
  onMarkLost: (dealId: string) => Promise<{ success: true } | { error: string }>;
  onRename: (dealId: string, name: string) => Promise<{ success: true; data: { name: string } } | { error: string }>;
  onReopen: (
    dealId: string,
  ) => Promise<{ success: true; data: { status: DealStatus } } | { error: string }>;
  onActivateDeal: (dealId: string, status: DealStatus) => void;
  onSelectCustomer: (participant: ConversationParticipant, dealId: string) => void;
  onActivitiesSeen: (conversationId: string, unreadCount: number) => void;
  readNotice?: ThreadReadNotice | null;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsSettled, setDetailsSettled] = useState(false);
  const [focusedDealId, setFocusedDealId] = useState(workspace.deal.id);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [quotePatches, setQuotePatches] = useState<Record<string, ConversationQuote>>({});
  const [dealStatusPatches, setDealStatusPatches] = useState<Record<string, DealStatus>>({});
  const [dealNamePatches, setDealNamePatches] = useState<Record<string, string>>({});
  const [renameNotice, setRenameNotice] = useState<{
    id: number;
    dealId: string;
    name: string;
    previousName: string;
  } | null>(null);
  const [undoingRename, setUndoingRename] = useState(false);
  const renameNoticeRef = useRef(renameNotice);
  renameNoticeRef.current = renameNotice;
  const deals = workspace.deals.map((option) => {
    const status = dealStatusPatches[option.id];
    const renamed = dealNamePatches[option.id];
    const deal = {
      ...option.deal,
      ...(status
        ? {
            previousStatus: option.deal.status === status ? option.deal.previousStatus : option.deal.status,
            status,
          }
        : {}),
      ...(renamed ? { name: renamed } : {}),
    };
    const patch = option.quote ? quotePatches[option.quote.id] : undefined;
    const customName = deal.name?.trim();
    if (!patch && !status && !renamed) return option;
    return {
      ...option,
      title: customName || (patch ? productTitle(patch.specs) || option.title : option.title),
      priceLabel: patch?.totalLabel ?? option.priceLabel,
      stage: deal.status,
      deal,
      quote: patch ?? option.quote,
    };
  });
  const focusedOption = deals.find((deal) => deal.id === focusedDealId) ?? deals[0];
  const participants = participantsForDeal(workspace.participants, focusedOption?.id ?? workspace.deal.id, {
    dealId: focusedOption?.id ?? workspace.deal.id,
    isPrimary: true,
    conversationId: workspace.id,
    customer: workspace.customer,
  });
  const focused = focusedOption
    ? { ...workspace, deal: focusedOption.deal, quote: focusedOption.quote }
    : workspace;
  const [draft, setDraft] = useState("");
  const [channel, setChannel] = useState<ComposerChannel>("telegram");
  const [channelOpen, setChannelOpen] = useState(false);
  const threadId = workspace.id;
  const threadActivities = workspace.activities;
  const { activities, setActivities } = useConversationActivities(threadId, threadActivities, incoming);
  const activitiesRef = useRef(activities);
  activitiesRef.current = activities;
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const [detailsTop, setDetailsTop] = useState<number | null>(null);

  useLayoutEffect(() => {
    const header = headerRef.current;
    const status = statusRef.current;
    if (!header || !status) return;
    const place = () => {
      const headerBox = header.getBoundingClientRect();
      const statusBox = status.getBoundingClientRect();
      setDetailsTop(statusBox.bottom - headerBox.top);
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(header);
    observer.observe(status);
    return () => observer.disconnect();
  }, [editing, focusedDealId, detailsOpen]);

  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [revisionError, setRevisionError] = useState("");
  const channelMenu = useRef<HTMLDivElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const appliedReadToken = useRef(0);
  const suppressUntilHidden = useVisibleActivityReads({
    rootRef: thread,
    conversationId: workspace.id,
    activitiesRef,
    onRead: ({ positions, readAt, unreadCount }) => {
      setActivities((current) =>
        current.map((activity) =>
          positions.includes(activity.position) ? { ...activity, read: true, readAt } : activity,
        ),
      );
      onActivitiesSeen(workspace.id, unreadCount);
    },
  });

  useEffect(() => {
    if (!readNotice || readNotice.token === appliedReadToken.current) return;
    appliedReadToken.current = readNotice.token;
    if (readNotice.kind === "activity") {
      if (readNotice.conversationId !== workspace.id) return;
      if (readNotice.readAt == null) suppressUntilHidden(readNotice.position);
      setActivities((current) =>
        current.map((activity) =>
          activity.position === readNotice.position
            ? { ...activity, read: readNotice.readAt != null, readAt: readNotice.readAt }
            : activity,
        ),
      );
      return;
    }
    if (!readNotice.conversationIds.includes(workspace.id)) return;
    setActivities((current) => {
      if (readNotice.kind !== "conversations") return current;
      if (readNotice.read) {
        const readAt = new Date().toISOString();
        return current.map((activity) => (activity.read ? activity : { ...activity, read: true, readAt }));
      }
      let last = -1;
      for (const activity of current) if (activity.position > last) last = activity.position;
      if (last < 0) return current;
      suppressUntilHidden(last);
      return current.map((activity) =>
        activity.position === last ? { ...activity, read: false, readAt: null } : activity,
      );
    });
  }, [readNotice, suppressUntilHidden, workspace.id]);
  const specs = focused.quote?.specs ?? [];
  const viewed = viewedRevision(focused.quote, selectedRevisionId);
  const title = productTitle(viewed?.specs ?? specs);
  const channels: ComposerChannel[] = ["telegram", "sms", "facebook", "email"];

  useEffect(() => {
    setRenameNotice(null);
  }, [workspace.id]);

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (!channelMenu.current?.contains(event.target as Node)) setChannelOpen(false);
    }
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  function onThreadScroll() {
    const pane = thread.current;
    if (!pane) return;
    stickToBottom.current = pane.scrollHeight - pane.scrollTop - pane.clientHeight < 80;
  }

  useEffect(() => {
    const pane = thread.current;
    if (pane && stickToBottom.current) pane.scrollTop = pane.scrollHeight;
  }, [activities.length]);

  useEffect(() => {
    if (!editing) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setEditing(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editing]);

  function toggleDetails() {
    const next = !detailsOpen;
    setDetailsOpen(next);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setDetailsSettled(next && reduceMotion);
  }

  function selectDeal(dealId: string) {
    const option = deals.find((deal) => deal.id === dealId);
    setFocusedDealId(dealId);
    setSelectedRevisionId(null);
    setRevisionError("");
    setEditing(false);
    if (option) onActivateDeal(option.id, option.stage);
  }

  async function selectRevision(revisionId: string) {
    const quote = focused.quote;
    if (!quote) return;
    if (quote.activeRevisionId === revisionId) {
      setSelectedRevisionId(revisionId);
      setRevisionError("");
      return;
    }
    const previousPatch = quotePatches[quote.id];
    const next = conversationQuoteWithActiveRevision(quote, revisionId);
    if (!next) return;
    setRevisionError("");
    setQuotePatches((current) => ({ ...current, [next.id]: next }));
    setSelectedRevisionId(revisionId);
    const result = await activateQuoteRevision({ quoteId: quote.id, revisionId });
    if (!("error" in result)) return;
    setQuotePatches((current) => {
      const restored = { ...current };
      if (previousPatch) restored[quote.id] = previousPatch;
      else delete restored[quote.id];
      return restored;
    });
    setSelectedRevisionId(quote.activeRevisionId);
    setRevisionError(copy.activateRevisionError);
  }

  function toggleEditing() {
    if (!editing) setDetailsOpen(false);
    setEditing((open) => !open);
  }

  async function saveFocusedQuote(selections: QuoteSelections) {
    const quote = focused.quote;
    if (!quote) throw new Error(copy.saveQuoteError);
    const result = await saveQuoteSelections({ quoteId: quote.id, selections });
    if ("error" in result) throw new Error(result.error);
    const next = conversationQuoteFromSelections(quote, selections, result.data);
    if (!next) throw new Error(copy.saveQuoteError);
    setQuotePatches((current) => ({ ...current, [next.id]: next }));
    setSelectedRevisionId(result.data.id);
    setEditing(false);
  }

  async function sendViewedQuote() {
    const quote = focused.quote;
    if (!quote || !viewed) throw new Error(copy.sendQuoteError);
    const result = await sendConversationQuote({
      quoteId: quote.id,
      revisionId: viewed.id,
      dealId: focused.deal.id,
    });
    if ("error" in result) throw new Error(result.error);
    const next = conversationQuoteWithSentRevision(quote, result.data.revisionId, result.data.updatedAt);
    if (!next) throw new Error(copy.sendQuoteError);
    setQuotePatches((current) => ({ ...current, [next.id]: next }));
    setDealStatusPatches((current) => ({ ...current, [focused.deal.id]: result.data.dealStatus }));
  }

  useLayoutEffect(() => {
    const node = composerRef.current;
    if (!node) return;
    if (!draft) {
      node.style.height = "";
      return;
    }
    node.style.height = "0px";
    node.style.height = `${node.scrollHeight}px`;
  }, [draft]);

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending || !threadId) return;
    setSending(true);
    setSendError("");
    const result = await sendManualActivity({ conversationId: threadId, text, channel });
    setSending(false);
    if ("error" in result) {
      setSendError(copy.sendFailed);
      return;
    }
    setActivities((current) =>
      current.some((item) => item.position === result.data.position) ? current : [...current, result.data],
    );
    setDraft("");
  }

  async function rename(name: string) {
    const dealId = focused.deal.id;
    const previousName = (focusedOption?.title || copy.quote).slice(0, dealNameMaxLength);
    const result = await onRename(dealId, name);
    if ("error" in result) return result;
    setDealNamePatches((current) => ({ ...current, [dealId]: result.data.name }));
    setRenameNotice({ id: Date.now(), dealId, name: result.data.name, previousName });
    return { success: true as const };
  }

  async function undoRename() {
    const notice = renameNoticeRef.current;
    if (!notice || undoingRename) return;
    setUndoingRename(true);
    const result = await onRename(notice.dealId, notice.previousName);
    setUndoingRename(false);
    if ("error" in result) return;
    setDealNamePatches((current) => ({ ...current, [notice.dealId]: result.data.name }));
    setRenameNotice((current) => (current?.id === notice.id ? null : current));
  }

  async function markLost() {
    if (updatingStatus || focused.deal.status === "deal_lost") return;
    const dealId = focused.deal.id;
    setUpdatingStatus(true);
    setStatusError("");
    const result = await onMarkLost(dealId);
    setUpdatingStatus(false);
    if ("error" in result) {
      setStatusError(copy.markAsLostError);
      return;
    }
    setDealStatusPatches((current) => ({ ...current, [dealId]: "deal_lost" }));
  }

  async function reopen() {
    if (updatingStatus || focused.deal.status !== "deal_lost") return;
    const dealId = focused.deal.id;
    setUpdatingStatus(true);
    setStatusError("");
    const result = await onReopen(dealId);
    setUpdatingStatus(false);
    if ("error" in result) {
      setStatusError(copy.reopenDealError);
      return;
    }
    setDealStatusPatches((current) => ({ ...current, [dealId]: result.data.status }));
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#f9f9fb]">
      <div className="relative z-40 shrink-0 border-b border-gray-200 bg-white shadow-xs">
        <header
          ref={headerRef}
          className="relative z-20 flex flex-row items-center justify-between gap-4 overflow-visible bg-white px-5 py-3"
        >
          <div className="flex shrink-0 flex-col items-start justify-start gap-2 p-1">
            <div className="mb-1 lg:hidden">
              <button type="button" onClick={onBack} className="text-xs font-medium text-gray-900">
                {copy.backToList}
              </button>
            </div>
            <div className="flex items-center gap-2.5">
              <CustomerMenu
                participants={participants}
                customer={workspace.customer}
                conversationId={workspace.id}
                onSelect={(participant) => onSelectCustomer(participant, focused.deal.id)}
              />
              <a
                href={`tel:${workspace.customer.phone}`}
                aria-label={copy.callNow}
                title={`${copy.callNow} ${workspace.customer.fullName}`}
                className="ml-0.5 flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-transparent text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Phone className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
              </a>
            </div>
            <DealHeading
              title={focusedOption?.title || copy.quote}
              deals={deals}
              selectedId={focused.deal.id}
              selectedStage={focused.deal.status}
              lost={focused.deal.status === "deal_lost"}
              pending={updatingStatus}
              onSelectDeal={selectDeal}
              onRename={rename}
              onMarkLost={() => void markLost()}
              onReopen={() => void reopen()}
            />
            <div ref={statusRef}>
              <DealStatusBadge status={focused.deal.status} />
            </div>
            {statusError ? <p className="text-[11px] text-red-600">{statusError}</p> : null}
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            {focused.quote && viewed ? (
              <div className="flex flex-row items-center gap-3 p-1">
                <div className="relative flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                  <img
                    alt={title || copy.quote}
                    src={viewed.imageUrl}
                    className="h-full w-full object-contain p-0.5"
                  />
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <QuoteRevisionMenu
                    revisions={focused.quote.revisions}
                    activeRevisionId={focused.quote.activeRevisionId}
                    revision={viewed}
                    error={revisionError}
                    onSelectRevision={(id) => void selectRevision(id)}
                  />
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-pressed={editing}
                      onClick={toggleEditing}
                      className={`inline-flex items-center justify-center gap-1 rounded-md border bg-white px-2.5 py-1 text-xs font-medium whitespace-nowrap shadow-xs transition-colors ${
                        editing
                          ? "border-red-500 text-red-600 hover:bg-red-50"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {editing ? (
                        <X className="h-3.5 w-3.5 shrink-0 text-red-500" aria-hidden="true" />
                      ) : (
                        <Pencil className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden="true" />
                      )}
                      <span>{editing ? copy.cancelQuoteEdits : copy.editQuote}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewOpen(true)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-md bg-black px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white shadow-xs transition-colors hover:bg-gray-800"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>{copy.reviewAndSendQuote}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          {renameNotice ? (
            <Toast
              key={renameNotice.id}
              message={copy.dealRenamedTo(renameNotice.name)}
              actionLabel={copy.undo}
              dismissLabel={copy.dismiss}
              pending={undoingRename}
              onAction={() => void undoRename()}
              onDismiss={() => setRenameNotice((current) => (current?.id === renameNotice.id ? null : current))}
            />
          ) : null}
          {editing || detailsTop == null ? null : (
            <div
              className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
              style={{ top: detailsTop }}
            >
              <DetailsToggle open={detailsOpen} onClick={toggleDetails} />
            </div>
          )}
        </header>

        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${detailsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
          onTransitionEnd={(event) => {
            if (event.target !== event.currentTarget || event.propertyName !== "grid-template-rows") return;
            if (detailsOpen) setDetailsSettled(true);
          }}
        >
          <div className={`min-h-0 ${detailsOpen && detailsSettled ? "overflow-visible" : "overflow-hidden"}`}>
            <div className="grid grid-cols-1 gap-6 bg-white px-6 py-4 lg:grid-cols-2">
              <DealSummary workspace={focused} />
              <QuotePanel revision={viewed} />
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div ref={thread} className="min-h-0 flex-1 overflow-y-auto" onScroll={onThreadScroll}>
          <ConversationThread
            activities={activities}
            contactName={workspace.customer.fullName}
          />
        </div>

      <form
        className="shrink-0 border-t border-gray-200 bg-white p-4"
        onSubmit={submitMessage}
      >
        <div className="mb-2.5 flex items-center">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 shadow-xs transition-colors hover:bg-gray-50"
          >
            <Plus className="h-3.5 w-3.5 shrink-0 text-gray-500" strokeWidth={2} aria-hidden="true" />
            <span>{copy.attachDesignPreview}</span>
          </button>
        </div>
        <div className="relative flex items-end rounded-lg border border-gray-300 bg-white shadow-xs focus-within:border-black focus-within:ring-1 focus-within:ring-black">
          <button
            type="button"
            title={copy.attach}
            aria-label={copy.attach}
            className="mb-1.5 ml-2 shrink-0 rounded p-1.5 text-gray-400 transition-colors hover:text-gray-700"
          >
            <Paperclip className="h-4 w-4" aria-hidden="true" />
          </button>
          <textarea
            ref={composerRef}
            rows={1}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            aria-label={copy.composerPlaceholder}
            placeholder={copy.composerPlaceholder}
            className="max-h-60 min-h-10 w-full resize-none overflow-y-auto border-0 bg-transparent py-2.5 pr-3.5 pl-2 text-xs leading-5 text-gray-900 outline-none placeholder:text-gray-400 focus:ring-0"
          />
          <div className="mb-1.5 flex shrink-0 items-center space-x-1 pr-2">
            <div ref={channelMenu} className="relative mr-1.5 flex items-center">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={channelOpen}
                aria-label={copy.messageSource}
                onClick={() => setChannelOpen((open) => !open)}
                className="inline-flex items-center gap-1.5 rounded-md bg-transparent px-2.5 py-1.5 text-xs font-semibold text-gray-800 transition-colors hover:bg-gray-100"
              >
                <ChannelIcon channel={channel} className="h-3.5 w-3.5 shrink-0 text-gray-900" />
                <span className="font-medium">{activityChannelLabel(channel)}</span>
                <svg className="h-3 w-3 shrink-0 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              </button>
              {channelOpen ? (
                <ul
                  role="listbox"
                  aria-label={copy.messageSource}
                  className="absolute right-0 bottom-full z-30 mb-2 w-40 overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-md"
                >
                  {channels.map((option) => (
                    <li key={option}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={option === channel}
                        onClick={() => {
                          setChannel(option);
                          setChannelOpen(false);
                        }}
                        className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs ${
                          option === channel ? "bg-gray-100 font-semibold text-gray-900" : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <ChannelIcon channel={option} className="h-3.5 w-3.5 shrink-0" />
                        {activityChannelLabel(option)}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="ml-1.5 h-4 w-px bg-gray-300" />
            </div>
            <button
              type="submit"
              disabled={!draft.trim() || sending}
              className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors ${
                draft.trim() ? "bg-gray-900 hover:bg-black disabled:opacity-60" : "bg-gray-300"
              }`}
            >
              {copy.send}
            </button>
          </div>
        </div>
        {sendError ? <p className="mt-2 text-xs text-red-600">{sendError}</p> : null}
      </form>
        {editing && focused.quote && viewed ? (
          <div className="absolute inset-0 z-30 flex min-h-0 flex-col overflow-hidden">
            <BuildingConfigurator
              key={`${focused.quote.id}:${viewed.id}`}
              mode="internal"
              selections={viewed.selections}
              onSave={saveFocusedQuote}
            />
          </div>
        ) : null}
      </div>
      {reviewOpen && focused.quote && viewed ? (
        <ReviewSendModal
          customerName={workspace.customer.fullName}
          title={title || copy.quote}
          priceLabel={viewed.totalLabel}
          invoiceId={focused.quote.invoiceId}
          imageUrl={viewed.imageUrl}
          statusLabel={revisionStatusLabel(viewed)}
          onSend={sendViewedQuote}
          onClose={() => setReviewOpen(false)}
        />
      ) : null}
    </div>
  );
}
