"use client";

import { ArrowUpRight, Paperclip, Pencil, Phone, Plus, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { BuildingConfigurator } from "@/src/features/cpq/components/building-configurator";
import { ComposerAttachments, type ComposerAttachment } from "@/src/features/crm/conversations/components/composer-attachments";
import { activityChannelLabel, ConversationThread, previewFrameHeight, type OutgoingMessage } from "@/src/features/crm/conversations/components/conversation-thread";
import { CustomerMenu } from "@/src/features/crm/conversations/components/customer-menu";
import { DealHeading } from "@/src/features/crm/conversations/components/deal-menu";
import { DealSummary } from "@/src/features/crm/conversations/components/deal-summary";
import { QuotePanel, QuoteRevisionMenu } from "@/src/features/crm/conversations/components/quote-panel";
import { Toast } from "@/src/common/components/toast";
import { ReviewSendModal } from "@/src/features/crm/conversations/components/review-send-modal";
import { useConversationActivities } from "@/src/features/crm/conversations/hooks/use-conversation-activities";
import { useVisibleActivityReads } from "@/src/features/crm/conversations/hooks/use-visible-activity-reads";
import { copy } from "@/src/features/crm/conversations/locales/en";
import { sendQuoteMessages, sendManualActivity, sendStoredAttachment, discardStoredAttachment, recordSystemActivity, deleteConversationActivity, markDealViewed } from "@/src/features/crm/conversations/server/actions";
import type {
  Activity,
  ComposerChannel,
  ConversationParticipant,
  ConversationQuote,
  ConversationQuoteRevision,
  ConversationWorkspace,
} from "@/src/features/crm/conversations/types";
import { uploadComposerAttachment } from "@/src/features/crm/conversations/utils/upload-attachment";
import { productTitle, revisionVersionLabel, systemEventText } from "@/src/features/crm/conversations/utils/formatting";
import {
  conversationQuoteFromSelections,
  conversationQuoteWithActiveRevision,
  conversationQuoteWithSentRevision,
} from "@/src/features/crm/conversations/utils/mappers";
import { activateQuoteRevision, saveQuoteCommunication, saveQuoteSelections } from "@/src/features/crm/quotes/server/actions";
import type { QuoteCommunication } from "@/src/features/crm/quotes/types";
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

type NoticeRecord = {
  id: number;
  message: string;
  pending: boolean;
  undoStarted: boolean;
  settled: boolean;
  cancelled: boolean;
  expired: boolean;
  published: Activity | null;
  undo: () => Promise<boolean>;
  commit: () => Promise<Activity | null>;
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
  onFocusDeal,
  onSystemActivity,
  onRemoveActivity,
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
  onFocusDeal: (dealId: string) => Promise<ConversationWorkspace | undefined>;
  onSystemActivity: (conversationId: string, activity: Activity) => void;
  onRemoveActivity: (conversationId: string, position: number) => void;
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
  const [seenDealIds, setSeenDealIds] = useState<string[]>([]);
  const requestedNewDeals = useRef(new Set<string>());
  const [notice, setNotice] = useState<{ id: number; message: string; pending: boolean } | null>(null);
  const noticeRecord = useRef<NoticeRecord | null>(null);
  const publishActivityRef = useRef<(activity: Activity) => void>(() => {});
  const removeActivityRef = useRef(onRemoveActivity);
  removeActivityRef.current = onRemoveActivity;
  const deals = workspace.deals.map((option) => {
    const status = dealStatusPatches[option.id];
    const renamed = dealNamePatches[option.id];
    const seen = seenDealIds.includes(option.id);
    const deal = {
      ...option.deal,
      viewedAt: seen ? option.deal.viewedAt ?? new Date().toISOString() : option.deal.viewedAt,
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
    if (!patch && !status && !renamed && !seen) return option;
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
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;
  const [outgoing, setOutgoing] = useState<OutgoingMessage[]>([]);
  const outgoingRef = useRef<OutgoingMessage[]>([]);
  const heldPreviews = useRef(new Map<string, string>());
  const previewFrames = useRef(new Map<string, number>());
  const imageHeights = useRef(new Map<string, number>());
  const uploads = useRef(new Map<string, { abort: () => void }>());
  const droppedAttachments = useRef(new Set<string>());
  const fileInput = useRef<HTMLInputElement>(null);
  const [channel, setChannel] = useState<ComposerChannel>("telegram");
  const [channelOpen, setChannelOpen] = useState(false);
  const threadId = workspace.id;
  const threadActivities = workspace.activities;
  const { activities, setActivities } = useConversationActivities(threadId, threadActivities, incoming);
  useEffect(() => {
    for (const activity of activities) {
      if (activity.channel !== "system") continue;
      const event = systemEventText(activity.text);
      if (event.kind !== "created" || !event.dealId || deals.some((deal) => deal.id === event.dealId)) continue;
      if (requestedNewDeals.current.has(event.dealId)) continue;
      requestedNewDeals.current.add(event.dealId);
      void onFocusDeal(focusedDealId);
      return;
    }
  }, [activities, deals, focusedDealId, onFocusDeal]);
  const activitiesRef = useRef(activities);
  activitiesRef.current = activities;
  const delivering = useRef(false);
  const [sendError, setSendError] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [communicationPatches, setCommunicationPatches] = useState<Record<string, QuoteCommunication>>({});
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
    const conversationId = workspace.id;
    return () => {
      const current = noticeRecord.current;
      if (!current || current.settled || current.cancelled || current.undoStarted) return;
      current.settled = true;
      void current.commit().then((activity) => {
        if (!activity || current.cancelled || current.undoStarted) {
          if (activity) {
            removeActivityRef.current(conversationId, activity.position);
            void deleteConversationActivity({ conversationId, position: activity.position });
          }
          return;
        }
        publishActivityRef.current(activity);
      });
    };
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

  useLayoutEffect(() => {
    const pane = thread.current;
    if (!pane || !stickToBottom.current) return;
    const distance = pane.scrollHeight - pane.scrollTop - pane.clientHeight;
    if (distance > 1) pane.scrollTop = pane.scrollHeight;
  }, [activities.length, outgoing.length]);

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

  function publishActivity(activity: Activity) {
    setActivities((current) =>
      current.some((item) => item.position === activity.position) ? current : [...current, activity],
    );
    onSystemActivity(workspace.id, activity);
  }
  publishActivityRef.current = publishActivity;

  async function retractActivity(activity: Activity) {
    setActivities((current) => current.filter((item) => item.position !== activity.position));
    onRemoveActivity(workspace.id, activity.position);
    await deleteConversationActivity({ conversationId: workspace.id, position: activity.position });
  }

  async function recordNamedActivity(kind: "deal" | "quote", name: string): Promise<Activity | null> {
    const result = await recordSystemActivity({ conversationId: workspace.id, kind, name });
    if ("error" in result) return null;
    return result.data;
  }

  async function finishNotice(current: NoticeRecord) {
    const activity = await current.commit();
    if (current.undoStarted || current.cancelled) {
      if (activity) await retractActivity(activity);
      return;
    }
    if (!activity) {
      if (noticeRecord.current === current) {
        noticeRecord.current = null;
        setNotice(null);
      }
      return;
    }
    current.published = activity;
    publishActivity(activity);
    if (noticeRecord.current === current) {
      noticeRecord.current = null;
      setNotice(null);
    }
  }

  function showNotice(message: string, undo: () => Promise<boolean>, commit: () => Promise<Activity | null>) {
    const previous = noticeRecord.current;
    if (previous && !previous.settled && !previous.cancelled && !previous.undoStarted) {
      previous.settled = true;
      void finishNotice(previous);
    }
    const next: NoticeRecord = {
      id: Date.now(),
      message,
      pending: false,
      undoStarted: false,
      settled: false,
      cancelled: false,
      expired: false,
      published: null,
      undo,
      commit,
    };
    noticeRecord.current = next;
    setNotice({ id: next.id, message: next.message, pending: false });
  }

  function commitNotice() {
    const current = noticeRecord.current;
    if (!current || current.settled || current.cancelled) return;
    if (current.undoStarted) {
      current.expired = true;
      return;
    }
    current.settled = true;
    setNotice(null);
    void finishNotice(current);
  }

  async function undoNotice() {
    const current = noticeRecord.current;
    if (!current || current.pending || current.undoStarted || current.cancelled) return;
    current.undoStarted = true;
    current.pending = true;
    setNotice({ id: current.id, message: current.message, pending: true });
    const undone = await current.undo();
    if (!undone) {
      current.undoStarted = false;
      current.pending = false;
      if (noticeRecord.current === current) {
        setNotice({ id: current.id, message: current.message, pending: false });
      }
      if (current.expired && !current.settled) {
        current.settled = true;
        void finishNotice(current);
      }
      return;
    }
    current.cancelled = true;
    current.settled = true;
    if (current.published) await retractActivity(current.published);
    if (noticeRecord.current === current) {
      noticeRecord.current = null;
      setNotice(null);
    }
  }

  function focusDeal(dealId: string) {
    const option = deals.find((deal) => deal.id === dealId);
    setFocusedDealId(dealId);
    setSelectedRevisionId(null);
    setRevisionError("");
    setEditing(false);
    if (option) onActivateDeal(option.id, option.stage);
    return option;
  }

  function selectDeal(dealId: string) {
    const previous = deals.find((deal) => deal.id === focusedDealId);
    const option = focusDeal(dealId);
    if (!option || !previous || option.id === previous.id) return;
    setSeenDealIds((current) => (current.includes(option.id) ? current : [...current, option.id]));
    const previousId = previous.id;
    showNotice(
      copy.activeDealSwitchedToast(option.title),
      async () => {
        setSeenDealIds((current) => current.filter((id) => id !== option.id));
        focusDeal(previousId);
        return true;
      },
      async () => {
        await markDealViewed(option.id);
        return recordNamedActivity("deal", option.title);
      },
    );
  }

  async function selectRevision(revisionId: string) {
    const quote = focused.quote;
    if (!quote) return;
    if (quote.activeRevisionId === revisionId) {
      setSelectedRevisionId(revisionId);
      setRevisionError("");
      return;
    }
    const previousId = quote.activeRevisionId;
    const previousPatch = quotePatches[quote.id];
    const next = conversationQuoteWithActiveRevision(quote, revisionId);
    const revision = next?.revisions.find((item) => item.id === revisionId);
    if (!next || !revision) return;
    setRevisionError("");
    setQuotePatches((current) => ({ ...current, [next.id]: next }));
    setSelectedRevisionId(revisionId);
    const result = await activateQuoteRevision({ quoteId: quote.id, revisionId });
    if ("error" in result) {
      setQuotePatches((current) => {
        const restored = { ...current };
        if (previousPatch) restored[quote.id] = previousPatch;
        else delete restored[quote.id];
        return restored;
      });
      setSelectedRevisionId(previousId);
      setRevisionError(copy.activateRevisionError);
      return;
    }
    const name = revisionVersionLabel(revision.status, revision.revisionNumber);
    showNotice(
      copy.activeQuoteSwitchedToast(name),
      async () => {
        const undone = await activateQuoteRevision({ quoteId: quote.id, revisionId: previousId });
        if ("error" in undone) return false;
        setQuotePatches((current) => {
          const restored = { ...current };
          if (previousPatch) restored[quote.id] = previousPatch;
          else delete restored[quote.id];
          return restored;
        });
        setSelectedRevisionId(previousId);
        return true;
      },
      () => recordNamedActivity("quote", name),
    );
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

  async function saveViewedCommunication(communication: QuoteCommunication) {
    if (!viewed) throw new Error(copy.saveQuoteError);
    const result = await saveQuoteCommunication({ revisionId: viewed.id, communication });
    if ("error" in result) throw new Error(result.error);
    setCommunicationPatches((current) => ({ ...current, [viewed.id]: communication }));
  }

  async function sendViewedQuote(communication: QuoteCommunication) {
    const quote = focused.quote;
    if (!quote || !viewed) throw new Error(copy.sendQuoteError);
    const result = await sendQuoteMessages({
      quoteId: quote.id,
      revisionId: viewed.id,
      dealIds: [focused.deal.id],
      dealName: focusedOption?.title || title || copy.quote,
      dealPrice: viewed.totalLabel,
      communication,
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

  useEffect(() => {
    const pendingUploads = uploads.current;
    const dropped = droppedAttachments.current;
    return () => {
      for (const item of attachmentsRef.current) {
        dropped.add(item.id);
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        pendingUploads.get(item.id)?.abort();
        void discardStoredAttachment(item.id);
      }
      for (const item of outgoingRef.current) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
      for (const url of heldPreviews.current.values()) URL.revokeObjectURL(url);
    };
  }, []);

  function appendActivity(activity: Activity) {
    setActivities((current) => {
      if (current.some((item) => item.position === activity.position)) return current;
      return [...current, activity].sort((left, right) => left.position - right.position);
    });
  }

  function addAttachments(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (files.length === 0) return;
    const next = files.map((file) => {
      const id = crypto.randomUUID();
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      return { id, file, previewUrl, phase: "uploading" as const, progress: 0 };
    });
    setAttachments((current) => [...current, ...next]);
    for (const item of next) {
      if (!item.previewUrl) continue;
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          previewFrames.current.set(item.id, previewFrameHeight(img.naturalWidth, img.naturalHeight));
        }
      };
      img.src = item.previewUrl;
    }
    for (const item of next) {
      const upload = uploadComposerAttachment(item.id, item.file, (progress) => {
        setAttachments((current) =>
          current.map((row) => (row.id === item.id && row.phase === "uploading" ? { ...row, progress } : row)),
        );
      });
      uploads.current.set(item.id, upload);
      void upload.done.then((result) => {
        uploads.current.delete(item.id);
        if (droppedAttachments.current.has(item.id)) {
          void discardStoredAttachment(item.id);
          return;
        }
        if ("error" in result) {
          setAttachments((current) =>
            current.map((row) => (row.id === item.id ? { ...row, phase: "failed", progress: 0 } : row)),
          );
          setSendError(result.error);
          return;
        }
        setAttachments((current) =>
          current.map((row) => (row.id === item.id && row.phase === "uploading" ? { ...row, progress: 100 } : row)),
        );
      });
    }
  }

  function showUploadFinished(id: string) {
    setAttachments((current) =>
      current.map((row) => (row.id === id && row.phase === "uploading" ? { ...row, phase: "ready", progress: 100 } : row)),
    );
  }

  function removeAttachment(id: string) {
    droppedAttachments.current.add(id);
    uploads.current.get(id)?.abort();
    uploads.current.delete(id);
    void discardStoredAttachment(id);
    setAttachments((current) => {
      const item = current.find((row) => row.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return current.filter((row) => row.id !== id);
    });
  }

  function replaceOutgoing(next: OutgoingMessage[]) {
    outgoingRef.current = next;
    setOutgoing(next);
  }

  async function pumpOutgoing() {
    if (delivering.current || !threadId) return;
    delivering.current = true;
    while (true) {
      const item = outgoingRef.current.find((row) => row.status === "queued");
      if (!item) break;
      replaceOutgoing(
        outgoingRef.current.map((row) => (row.id === item.id ? { ...row, status: "sending", error: "" } : row)),
      );
      const result =
        item.kind === "text"
          ? await sendManualActivity({ conversationId: threadId, text: item.text, channel: item.channel })
          : await sendStoredAttachment({
              conversationId: threadId,
              channel: item.channel,
              id: item.id,
              name: item.name || copy.attachment,
              image: item.kind === "image",
            });
      if ("error" in result) {
        replaceOutgoing(
          outgoingRef.current.map((row) => (row.id === item.id ? { ...row, status: "failed", error: result.error } : row)),
        );
        delivering.current = false;
        return;
      }
      appendActivity(result.data);
      if (item.kind === "text") continue;
      replaceOutgoing(
        outgoingRef.current.map((row) => (row.id === item.id ? { ...row, status: "sent", error: "" } : row)),
      );
    }
    delivering.current = false;
  }

  function retryOutgoing(id: string) {
    const item = outgoingRef.current.find((row) => row.id === id && row.status === "failed");
    if (!item) return;
    replaceOutgoing(
      outgoingRef.current.map((row) => (row.id === id ? { ...row, status: "queued", error: "" } : row)),
    );
    void pumpOutgoing();
  }

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    const pending = attachmentsRef.current.filter((item) => item.phase === "ready");
    const uploading = attachmentsRef.current.some((item) => item.phase === "uploading");
    if (uploading || !threadId || (!text && pending.length === 0)) return;
    const sentAt = new Date().toISOString();
    const afterPosition = activitiesRef.current.reduce((max, activity) => Math.max(max, activity.position), -1);
    const batch: OutgoingMessage[] = [];
    if (text) {
      batch.push({
        id: crypto.randomUUID(),
        kind: "text",
        channel,
        text,
        name: "",
        sentAt,
        afterPosition,
        status: "queued",
        error: "",
      });
    }
    for (const item of pending) {
      batch.push({
        id: item.id,
        kind: item.file.type.startsWith("image/") ? "image" : "file",
        channel,
        text: "",
        name: item.file.name || copy.attachment,
        previewUrl: item.previewUrl,
        sentAt,
        afterPosition,
        status: "queued",
        error: "",
      });
    }
    const measured: Record<string, number> = {};
    const pendingFrames = batch.filter((item) => {
      if (item.kind !== "image" || !item.previewUrl) return false;
      heldPreviews.current.set(item.id, item.previewUrl);
      const known = previewFrames.current.get(item.id);
      if (known) measured[item.id] = known;
      return !known;
    });
    await Promise.all(
      pendingFrames.map(async (item) => {
        const img = new Image();
        img.src = item.previewUrl ?? "";
        try {
          await img.decode();
        } catch {
          return;
        }
        if (img.naturalWidth <= 0 || img.naturalHeight <= 0) return;
        measured[item.id] = previewFrameHeight(img.naturalWidth, img.naturalHeight);
      }),
    );
    for (const item of batch) {
      if (item.kind !== "image") continue;
      item.frameHeight = measured[item.id] ?? previewFrameHeight(0, 0);
      imageHeights.current.set(item.id, item.frameHeight);
    }
    const ids = new Set(pending.map((item) => item.id));
    setAttachments((current) => current.filter((row) => !ids.has(row.id)));
    setDraft("");
    replaceOutgoing([...outgoingRef.current, ...batch]);
    setSendError("");
    void pumpOutgoing();
  }

  async function rename(name: string) {
    const dealId = focused.deal.id;
    const previousName = (focusedOption?.title || copy.quote).slice(0, dealNameMaxLength);
    const result = await onRename(dealId, name);
    if ("error" in result) return result;
    setDealNamePatches((current) => ({ ...current, [dealId]: result.data.name }));
    const nextName = result.data.name;
    showNotice(
      copy.dealRenamedTo(nextName),
      async () => {
        const undone = await onRename(dealId, previousName);
        if ("error" in undone) return false;
        setDealNamePatches((current) => ({ ...current, [dealId]: undone.data.name }));
        return true;
      },
      async () => {
        const saved = await recordSystemActivity({
          conversationId: workspace.id,
          kind: "renamed",
          name: nextName,
          previousName,
        });
        return "error" in saved ? null : saved.data;
      },
    );
    return { success: true as const };
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

  const uploadingAttachment = attachments.some((item) => item.phase === "uploading");
  const canSend = !uploadingAttachment && (Boolean(draft.trim()) || attachments.some((item) => item.phase === "ready"));

  function composerActions() {
    return (
      <div className="mb-1.5 flex shrink-0 items-center space-x-1 pr-2">
        <div ref={channelMenu} className="relative mr-1.5 flex items-center">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={channelOpen}
            aria-label={copy.messageSource}
            onClick={() => setChannelOpen((open) => !open)}
            className="inline-flex items-center gap-1.5 rounded-md bg-transparent px-2.5 py-1.5 text-xs font-semibold text-gray-800 transition-colors hover:bg-gray-100 disabled:opacity-50"
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
          disabled={!canSend}
          aria-label={copy.send}
          className={`inline-flex min-w-16 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors disabled:opacity-100 ${
            canSend ? "bg-gray-900 hover:bg-black" : "bg-gray-300"
          }`}
        >
          {copy.send}
        </button>
      </div>
    );
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
          {notice ? (
            <Toast
              key={notice.id}
              message={notice.message}
              actionLabel={copy.undo}
              dismissLabel={copy.dismiss}
              pending={notice.pending}
              onAction={() => void undoNotice()}
              onDismiss={commitNotice}
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
        <div ref={thread} className="min-h-0 flex-1 overflow-y-auto [overflow-anchor:none]" onScroll={onThreadScroll}>
          <ConversationThread
            activities={activities}
            contactName={workspace.customer.fullName}
            outgoing={outgoing}
            onRetry={retryOutgoing}
            imageHeights={imageHeights.current}
            previewUrls={heldPreviews.current}
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
        <div
          className={`relative rounded-lg border border-gray-300 bg-white shadow-xs focus-within:border-gray-600 ${
            attachments.length > 0 ? "flex flex-col" : "flex items-end"
          }`}
        >
          <input
            ref={fileInput}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              addAttachments(event.target.files);
              event.target.value = "";
            }}
          />
          <div className={attachments.length > 0 ? "flex items-end" : "contents"}>
            <button
              type="button"
              title={copy.attach}
              aria-label={copy.attach}
              onClick={() => fileInput.current?.click()}
              className="mb-1.5 ml-2 shrink-0 rounded p-1.5 text-gray-400 transition-colors hover:text-gray-700 disabled:opacity-50"
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
            {attachments.length === 0 ? composerActions() : null}
          </div>
          {attachments.length > 0 ? (
            <>
              <ComposerAttachments
                attachments={attachments}
                onRemove={removeAttachment}
                onUploadShown={showUploadFinished}
              />
              <div className="flex justify-end">{composerActions()}</div>
            </>
          ) : null}
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
          participants={participants}
          title={title || copy.quote}
          priceLabel={viewed.totalLabel}
          invoiceId={focused.quote.invoiceId}
          quoteId={focused.quote.id}
          imageUrl={viewed.imageUrl}
          statusLabel={revisionStatusLabel(viewed)}
          communication={communicationPatches[viewed.id] ?? viewed.communication}
          onSave={saveViewedCommunication}
          onSend={sendViewedQuote}
          onClose={() => setReviewOpen(false)}
        />
      ) : null}
    </div>
  );
}
