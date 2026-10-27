"use client";

import { Camera, Paperclip, Phone } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { BuildingConfigurator } from "@/src/features/cpq/components/building-configurator";
import type { QuoteRevisionRenderCapture, QuoteRevisionRenderFiles } from "@/src/features/cpq/components/building-scene";
import { ComposerAttachments, type ComposerAttachment } from "@/src/features/crm/conversations/components/composer-attachments";
import { DesignPreviewModal } from "@/src/features/crm/conversations/components/design-preview-modal";
import { activityChannelLabel, ConversationThread, previewFrameHeight, type OutgoingMessage } from "@/src/features/crm/conversations/components/conversation-thread";
import { CustomerMenu } from "@/src/features/crm/conversations/components/customer-menu";
import { DealHeading } from "@/src/features/crm/conversations/components/deal-menu";
import { DealSummary } from "@/src/features/crm/conversations/components/deal-summary";
import { QuoteActionsMenu } from "@/src/features/crm/conversations/components/quote-actions-menu";
import { QuoteStatusActions } from "@/src/features/crm/conversations/components/quote-status-actions";
import { QuoteMenu, QuotePanel } from "@/src/features/crm/conversations/components/quote-panel";
import { Toast, type ToastTone } from "@/src/common/components/toast";
import { InboundIntentCard } from "@/src/features/crm/conversations/components/inbound-intent-card";
import { ProposedShedRender } from "@/src/features/crm/conversations/components/proposed-shed-render";
import { ReviewSendModal } from "@/src/features/crm/conversations/components/review-send-modal";
import { useConversationActivities } from "@/src/features/crm/conversations/hooks/use-conversation-activities";
import { useConversationSuggestions } from "@/src/features/crm/conversations/hooks/use-conversation-suggestions";
import { useVisibleActivityReads } from "@/src/features/crm/conversations/hooks/use-visible-activity-reads";
import { copy } from "@/src/features/crm/conversations/locales/en";
import { sendQuoteMessages, sendManualActivity, sendStoredAttachment, discardStoredAttachment, recordSystemActivity, deleteConversationActivity, loadConversationDeal, markDealViewed, moveQuoteToNewDeal } from "@/src/features/crm/conversations/server/actions";
import type {
  Activity,
  ComposerChannel,
  ConversationDealOption,
  ConversationParticipant,
  ConversationQuote,
  ConversationQuoteRevision,
  ConversationSuggestion,
  ConversationWorkspace,
} from "@/src/features/crm/conversations/types";
import { emailActivityText } from "@/src/features/crm/conversations/utils/email-message";
import { uploadComposerAttachment } from "@/src/features/crm/conversations/utils/upload-attachment";
import { productTitle, quoteMenuName, revisionMenuLabel, systemEventText } from "@/src/features/crm/conversations/utils/formatting";
import { quoteDisplayName } from "@/src/features/crm/quotes/utils/formatting";
import { latestShareAt, suggestionQuoteTargets } from "@/src/features/crm/conversations/utils/suggestion-quotes";
import {
  conversationQuoteFromSelections,
  conversationQuoteWithActiveRevision,
  conversationQuoteWithSentRevision,
  conversationQuoteWithSharedPhotos,
} from "@/src/features/crm/conversations/utils/mappers";
import { quoteStatuses, type QuoteStatusActionId } from "@/src/features/crm/quotes/config/status";
import {
  activateQuoteRevision,
  cancelQuote,
  createDealQuoteAction,
  deleteDraftQuote,
  duplicateQuote,
  payQuoteDeposit,
  refreshQuoteLifecycle,
  renewQuote,
  saveQuoteCommunication,
  saveQuoteSelections,
  shareQuoteRevisionPhotos,
} from "@/src/features/crm/quotes/server/actions";
import type { ConfigChanges, QuoteCommunication, QuoteStatus } from "@/src/features/crm/quotes/types";
import type { QuoteSelections } from "@/src/features/cpq/types";
import { DealStatusBadge } from "@/src/features/crm/deals/components/deal-status-badge";
import { canMarkDealLost } from "@/src/features/crm/deals/utils/status";
import { dealNameMaxLength, type DealStatus } from "@/src/features/crm/deals/types";
import { configChangeRows } from "@/src/features/crm/conversations/utils/config-changes-summary";
import { selectionsWithConfigChanges } from "@/src/features/crm/conversations/utils/design-preview";
import {
  customerInboundMessages,
  estimateDelta,
  sameSelections,
  selectionTotals,
} from "@/src/features/crm/conversations/utils/inbound-intent";
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
  tone: ToastTone;
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
  return revisionMenuLabel(revision.revisionNumber);
}

function quotesForDeal(
  option: ConversationWorkspace["deals"][number],
  patches: Record<string, ConversationQuote>,
  added: ConversationQuote[],
  removed: Record<string, true>,
): ConversationQuote[] {
  const base = option.quotes.length > 0 ? option.quotes : option.quote ? [option.quote] : [];
  const known = new Set(base.map((quote) => quote.id));
  return [...base, ...added.filter((quote) => !known.has(quote.id))]
    .map((quote) => patches[quote.id] ?? quote)
    .filter((quote) => !removed[quote.id]);
}

function dealHasQuotes(option: { quote: ConversationQuote | null; quotes: ConversationQuote[] }): boolean {
  return option.quotes.length > 0 || option.quote != null;
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

function headerRenderUrl(revisions: ConversationQuoteRevision[], viewed: ConversationQuoteRevision): string {
  if (viewed.renders?.render_small_url) return viewed.renders.render_small_url;
  let match: ConversationQuoteRevision | null = null;
  for (const revision of revisions) {
    if (revision.revisionNumber >= viewed.revisionNumber || !revision.renders?.render_small_url) continue;
    if (!match || revision.revisionNumber > match.revisionNumber) match = revision;
  }
  return match?.renders?.render_small_url || viewed.imageUrl;
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

function quoteLabel(quote: ConversationQuote | undefined, index: number): string {
  if (quote?.quoteNumber) return quoteDisplayName(quote.quoteNumber, quote.specs);
  return index >= 0 ? quoteMenuName(index) : copy.quote;
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
  const [loadedDealOptions, setLoadedDealOptions] = useState<Record<string, ConversationDealOption>>({});
  const dealLoad = useRef(0);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [viewingQuoteIds, setViewingQuoteIds] = useState<Record<string, string>>({});
  const [addedQuotes, setAddedQuotes] = useState<Record<string, ConversationQuote[]>>({});
  const [addingQuote, setAddingQuote] = useState(false);
  const [quoteAction, setQuoteAction] = useState<"move" | "duplicate" | "cancel" | "delete" | "renew" | "deposit" | null>(null);
  const [removedQuoteIds, setRemovedQuoteIds] = useState<Record<string, true>>({});
  const [quoteNote, setQuoteNote] = useState("");
  const [quotePatches, setQuotePatches] = useState<Record<string, ConversationQuote>>({});
  const [dealStatusPatches, setDealStatusPatches] = useState<Record<string, DealStatus>>({});
  const [dealNamePatches, setDealNamePatches] = useState<Record<string, string>>({});
  const [seenDealIds, setSeenDealIds] = useState<string[]>([]);
  const requestedNewDeals = useRef(new Set<string>());
  const [notice, setNotice] = useState<{ id: number; message: string; pending: boolean; tone: ToastTone } | null>(null);
  const noticeRecord = useRef<NoticeRecord | null>(null);
  const pendingLostDealId = useRef<string | null>(null);
  const publishActivityRef = useRef<(activity: Activity) => void>(() => {});
  const removeActivityRef = useRef(onRemoveActivity);
  removeActivityRef.current = onRemoveActivity;
  const deals = workspace.deals.map((incoming) => {
    const option = dealHasQuotes(incoming) ? incoming : loadedDealOptions[incoming.id] ?? incoming;
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
    const quotes = quotesForDeal(option, quotePatches, addedQuotes[option.id] ?? [], removedQuoteIds);
    const primary = quotes.find((quote) => quote.id === option.deal.quoteId) ?? quotes[0];
    const patchedPrimary = primary && quotePatches[primary.id]?.id === option.deal.quoteId ? primary : undefined;
    const customName = deal.name?.trim();
    const quotesChanged =
      quotes.length !== (option.quotes.length > 0 ? option.quotes.length : option.quote ? 1 : 0) ||
      quotes.some((quote, index) => quote !== (option.quotes[index] ?? option.quote));
    if (!patchedPrimary && !quotesChanged && !status && !renamed && !seen) {
      return option.quotes.length > 0 ? option : { ...option, quotes };
    }
    return {
      ...option,
      title: customName || (patchedPrimary ? productTitle(patchedPrimary.specs) || option.title : option.title),
      priceLabel: patchedPrimary?.totalLabel ?? primary?.totalLabel ?? option.priceLabel,
      stage: deal.status,
      deal,
      quote: primary ?? option.quote,
      quotes,
    };
  });
  const focusedOption = deals.find((deal) => deal.id === focusedDealId) ?? deals[0];
  const listedQuotes = focusedOption ? quotesForDeal(focusedOption, {}, [], removedQuoteIds) : [];
  const viewingQuote =
    listedQuotes.find((quote) => quote.id === viewingQuoteIds[focusedOption?.id ?? ""]) ?? listedQuotes[0] ?? null;
  const participants = participantsForDeal(workspace.participants, focusedOption?.id ?? workspace.deal.id, {
    dealId: focusedOption?.id ?? workspace.deal.id,
    isPrimary: true,
    conversationId: workspace.id,
    customer: workspace.customer,
  });
  const focused = focusedOption
    ? { ...workspace, deal: focusedOption.deal, quote: viewingQuote }
    : workspace;
  const [draft, setDraft] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;
  const [outgoing, setOutgoing] = useState<OutgoingMessage[]>([]);
  const outgoingRef = useRef<OutgoingMessage[]>([]);
  const quotesByIdRef = useRef(new Map<string, ConversationQuote>());
  quotesByIdRef.current = new Map(deals.flatMap((deal) => deal.quotes.map((quote) => [quote.id, quote])));
  const lifecycleQuoteId = focused.quote?.id;
  const lifecycleStatus = focused.quote?.status;
  useEffect(() => {
    if (!lifecycleQuoteId || (lifecycleStatus !== "sent" && lifecycleStatus !== "viewed" && lifecycleStatus !== "changes_requested")) {
      return;
    }
    let cancelled = false;
    void refreshQuoteLifecycle({ quoteId: lifecycleQuoteId, openedByCustomer: false }).then((result) => {
      if (cancelled || "error" in result || result.data.status === lifecycleStatus) return;
      const quote = quotesByIdRef.current.get(lifecycleQuoteId);
      if (!quote) return;
      setQuotePatches((current) => {
        const base = current[quote.id] ?? quote;
        return {
          ...current,
          [quote.id]: {
            ...base,
            status: result.data.status,
            revisions: base.revisions.map((revision) =>
              revision.id === base.activeRevisionId ? { ...revision, status: result.data.status } : revision,
            ),
          },
        };
      });
    });
    return () => {
      cancelled = true;
    };
  }, [lifecycleQuoteId, lifecycleStatus]);
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
  const inboundMessages = useMemo(() => customerInboundMessages(activities), [activities]);
  const detectedSuggestions = useConversationSuggestions(focused.deal.id, workspace.id, inboundMessages);
  const applySuggestionRef = useRef(detectedSuggestions.apply);
  applySuggestionRef.current = detectedSuggestions.apply;
  const suggestionRenderCapture = useRef<QuoteRevisionRenderCapture | null>(null);
  const suggestionRenderUrl = useRef<string | null>(null);
  const armedPhotoSuggestionId = useRef<string | null>(null);
  const armedQuoteSuggestionId = useRef<string | null>(null);
  const [applyingIntent, setApplyingIntent] = useState(false);
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
  const [reviewImageUrl, setReviewImageUrl] = useState<string | null>(null);
  const [reviewSuggestionChanges, setReviewSuggestionChanges] = useState<ConfigChanges | null>(null);
  const [designPreviewOpen, setDesignPreviewOpen] = useState(false);
  const [photoSuggestionChanges, setPhotoSuggestionChanges] = useState<ConfigChanges | null>(null);
  const [photoPreview, setPhotoPreview] = useState<{
    quoteId: string;
    revision: ConversationQuoteRevision;
    revisions: ConversationQuoteRevision[];
    selections: QuoteSelections;
  } | null>(null);
  const [communicationPatches, setCommunicationPatches] = useState<Record<string, QuoteCommunication>>({});
  const [editing, setEditing] = useState(false);
  const [suggestedSelections, setSuggestedSelections] = useState<QuoteSelections | null>(null);
  const [intentQuoteChoice, setIntentQuoteChoice] = useState<{ suggestionId: string; quoteId: string } | null>(null);
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
  const composerPane = useRef<HTMLFormElement>(null);
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

  useLayoutEffect(() => {
    const form = composerPane.current;
    const pane = thread.current;
    if (!form || !pane) return;
    let height = form.offsetHeight;
    const observer = new ResizeObserver(() => {
      const next = form.offsetHeight;
      const growth = next - height;
      height = next;
      if (growth === 0) return;
      if (growth > 0) {
        pane.scrollTop += growth;
        return;
      }
      const distance = pane.scrollHeight - pane.scrollTop - pane.clientHeight;
      if (distance > 1) pane.scrollTop += growth;
    });
    observer.observe(form);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (editing) return;
    setSuggestedSelections(null);
  }, [editing]);

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

  async function recordNamedActivity(
    kind: "quote",
    name: string,
    previousName?: string,
  ): Promise<Activity | null> {
    const result = await recordSystemActivity({ conversationId: workspace.id, kind, name, previousName });
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

  function showNotice(
    message: string,
    undo: () => Promise<boolean>,
    commit: () => Promise<Activity | null>,
    tone: ToastTone = "success",
  ) {
    const previous = noticeRecord.current;
    if (previous && !previous.settled && !previous.cancelled && !previous.undoStarted) {
      previous.settled = true;
      void finishNotice(previous);
    }
    const next: NoticeRecord = {
      id: Date.now(),
      message,
      tone,
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
    setNotice({ id: next.id, message: next.message, pending: false, tone });
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
    setNotice({ id: current.id, message: current.message, pending: true, tone: current.tone });
    const undone = await current.undo();
    if (!undone) {
      current.undoStarted = false;
      current.pending = false;
      if (noticeRecord.current === current) {
        setNotice({ id: current.id, message: current.message, pending: false, tone: current.tone });
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

  function finishDealSwitch(option: ConversationDealOption) {
    focusDeal(option.id);
    setSeenDealIds((current) => (current.includes(option.id) ? current : [...current, option.id]));
    void markDealViewed(option.id);
  }

  function selectDeal(dealId: string) {
    if (dealId === focusedDealId) return;
    const option = deals.find((deal) => deal.id === dealId);
    if (!option) return;
    if (dealHasQuotes(option)) {
      finishDealSwitch(option);
      return;
    }
    const ticket = dealLoad.current + 1;
    dealLoad.current = ticket;
    void loadConversationDeal(dealId)
      .then((result) => {
        if (ticket !== dealLoad.current) return;
        if ("error" in result || !result.data) return;
        const loaded = result.data;
        if (dealHasQuotes(loaded)) {
          setLoadedDealOptions((current) => ({ ...current, [loaded.id]: loaded }));
        }
        finishDealSwitch(loaded);
      })
      .catch(() => undefined);
  }

  function selectRevision(revisionId: string) {
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
    const quoteIndex = listedQuotes.findIndex((item) => item.id === quote.id);
    const revisionName = revisionMenuLabel(revision.revisionNumber);
    const quoteName = quoteLabel(next, quoteIndex);
    const restore = () => {
      setQuotePatches((current) => {
        if (current[quote.id]?.activeRevisionId !== revisionId) return current;
        const restored = { ...current };
        if (previousPatch) restored[quote.id] = previousPatch;
        else delete restored[quote.id];
        return restored;
      });
      setSelectedRevisionId((current) => (current === revisionId ? previousId : current));
    };
    showNotice(
      quoteName ? copy.revisionSwitchedToast(quoteName, revisionName) : copy.activeQuoteSwitchedToast(revisionName),
      async () => {
        restore();
        return true;
      },
      async () => {
        const result = await activateQuoteRevision({ quoteId: quote.id, revisionId });
        if ("error" in result) {
          restore();
          setRevisionError(copy.activateRevisionError);
          return null;
        }
        return recordNamedActivity("quote", revisionName, quoteName || undefined);
      },
    );
  }

  function viewQuote(quoteId: string) {
    const dealId = focusedOption?.id;
    if (!dealId || !viewingQuote || quoteId === viewingQuote.id) return;
    setViewingQuoteIds((current) => ({ ...current, [dealId]: quoteId }));
    setSelectedRevisionId(null);
    setRevisionError("");
    setEditing(false);
  }

  async function addQuote() {
    const quote = focused.quote;
    const dealId = focusedOption?.id;
    if (!quote || !dealId || addingQuote) return;
    setAddingQuote(true);
    setRevisionError("");
    const result = await createDealQuoteAction({ dealId, selections: quote.selections });
    setAddingQuote(false);
    if ("error" in result) {
      setRevisionError(copy.addQuoteError);
      return;
    }
    const next = conversationQuoteFromSelections(
      {
        ...quote,
        id: result.data.id,
        invoiceId: result.data.invoiceId,
        quoteNumber: result.data.quoteNumber,
        revisions: [],
        status: "draft",
      },
      quote.selections,
      {
        id: result.data.revisionId,
        revisionNumber: result.data.revisionNumber,
        createdAt: result.data.createdAt,
        updatedAt: result.data.updatedAt,
      },
    );
    if (!next) {
      setRevisionError(copy.addQuoteError);
      return;
    }
    setAddedQuotes((current) => ({
      ...current,
      [dealId]: [...(current[dealId] ?? []), next],
    }));
    setViewingQuoteIds((current) => ({ ...current, [dealId]: next.id }));
    setSelectedRevisionId(next.activeRevisionId);
    setEditing(false);
  }

  async function moveFocusedQuote() {
    const quote = focused.quote;
    const dealId = focusedOption?.id;
    if (!quote || !dealId || quoteAction) return;
    setQuoteAction("move");
    setRevisionError("");
    setQuoteNote("");
    const result = await moveQuoteToNewDeal({ dealId, quoteId: quote.id });
    setQuoteAction(null);
    if ("error" in result) {
      setRevisionError(
        result.error.includes("migrate-crm-deal-optional-quote") ? result.error : copy.moveQuoteError,
      );
      return;
    }
    setAddedQuotes((current) =>
      Object.fromEntries(
        Object.entries(current).map(([id, quotes]) => [id, quotes.filter((item) => item.id !== quote.id)]),
      ),
    );
    setEditing(false);
    const loaded = await onFocusDeal(result.data.dealId);
    const stage = loaded?.deals.find((deal) => deal.id === result.data.dealId)?.stage ?? "new_lead";
    setFocusedDealId(result.data.dealId);
    setViewingQuoteIds((current) => ({ ...current, [result.data.dealId]: quote.id }));
    setSelectedRevisionId(null);
    onActivateDeal(result.data.dealId, stage);
  }

  async function duplicateFocusedQuote() {
    const quote = focused.quote;
    const dealId = focusedOption?.id;
    if (!quote || !dealId || quoteAction) return;
    setQuoteAction("duplicate");
    setRevisionError("");
    setQuoteNote("");
    const result = await duplicateQuote({ dealId, quoteId: quote.id });
    setQuoteAction(null);
    if ("error" in result) {
      setRevisionError(copy.duplicateQuoteError);
      return;
    }
    const next = conversationQuoteFromSelections(
      {
        ...quote,
        id: result.data.id,
        invoiceId: result.data.invoiceId,
        quoteNumber: result.data.quoteNumber,
        revisions: [],
        status: "draft",
      },
      quote.selections,
      {
        id: result.data.revisionId,
        revisionNumber: result.data.revisionNumber,
        createdAt: result.data.createdAt,
        updatedAt: result.data.updatedAt,
        renders: result.data.renders,
      },
    );
    if (!next) {
      setRevisionError(copy.duplicateQuoteError);
      return;
    }
    setAddedQuotes((current) => ({
      ...current,
      [dealId]: [...(current[dealId] ?? []), next],
    }));
    setViewingQuoteIds((current) => ({ ...current, [dealId]: next.id }));
    setSelectedRevisionId(next.activeRevisionId);
    setEditing(false);
  }

  function patchQuoteStatus(quote: ConversationQuote, status: QuoteStatus) {
    setQuotePatches((current) => {
      const base = current[quote.id] ?? quote;
      return {
        ...current,
        [quote.id]: {
          ...base,
          status,
          revisions: base.revisions.map((revision) =>
            revision.id === base.activeRevisionId ? { ...revision, status } : revision,
          ),
        },
      };
    });
  }

  function openQuoteReview() {
    armedQuoteSuggestionId.current = null;
    setReviewImageUrl(null);
    setReviewSuggestionChanges(null);
    setReviewOpen(true);
  }

  async function cancelFocusedQuote() {
    const quote = focused.quote;
    if (!quote || quoteAction) return;
    setQuoteAction("cancel");
    setRevisionError("");
    setQuoteNote("");
    const result = await cancelQuote({ quoteId: quote.id });
    setQuoteAction(null);
    if ("error" in result) {
      setRevisionError(copy.cancelQuoteError);
      return;
    }
    patchQuoteStatus(quote, "voided");
    setEditing(false);
  }

  async function deleteFocusedDraft() {
    const quote = focused.quote;
    if (!quote || quoteAction || quote.status !== "draft") return;
    setQuoteAction("delete");
    setRevisionError("");
    setQuoteNote("");
    const result = await deleteDraftQuote({ quoteId: quote.id });
    setQuoteAction(null);
    if ("error" in result) {
      setRevisionError(copy.deleteDraftError);
      return;
    }
    setRemovedQuoteIds((current) => ({ ...current, [quote.id]: true }));
    setEditing(false);
  }

  async function renewFocusedQuote() {
    const quote = focused.quote;
    if (!quote || quoteAction) return;
    setQuoteAction("renew");
    setRevisionError("");
    const result = await renewQuote({ quoteId: quote.id });
    setQuoteAction(null);
    if ("error" in result) {
      setRevisionError(copy.renewQuoteError);
      return;
    }
    patchQuoteStatus(quote, "draft");
    openQuoteReview();
  }

  async function collectFocusedDeposit() {
    const quote = focused.quote;
    const dealId = focusedOption?.id;
    if (!quote || !dealId || quoteAction) return;
    setQuoteAction("deposit");
    setRevisionError("");
    const result = await payQuoteDeposit({ quoteId: quote.id });
    setQuoteAction(null);
    if ("error" in result) {
      setRevisionError(copy.collectDepositError);
      return;
    }
    patchQuoteStatus(quote, "deposit_paid");
    setDealStatusPatches((current) => ({ ...current, [dealId]: "deal_won" }));
  }

  function runQuoteStatusAction(id: QuoteStatusActionId) {
    const quote = focused.quote;
    if (!quote) return;
    if (id === "send" || id === "resend") {
      openQuoteReview();
      return;
    }
    if (id === "edit") {
      toggleEditing();
      return;
    }
    if (id === "view_requested_changes") {
      setDetailsOpen(true);
      setDetailsSettled(true);
      return;
    }
    if (id === "collect_deposit") {
      void collectFocusedDeposit();
      return;
    }
    if (id === "view_signed_quote" || id === "view_deposit_receipt") {
      window.open(`/quote/${quote.id}`, "_blank", "noopener,noreferrer");
      return;
    }
    if (id === "renew") {
      void renewFocusedQuote();
      return;
    }
    if (id === "copy") void duplicateFocusedQuote();
  }

  function toggleEditing() {
    if (!editing) setDetailsOpen(false);
    setEditing((open) => !open);
  }

  async function saveFocusedQuote(selections: QuoteSelections, renders: QuoteRevisionRenderFiles) {
    const quote = focused.quote;
    if (!quote) throw new Error(copy.saveQuoteError);
    const result = await saveQuoteSelections({ quoteId: quote.id, selections, renders });
    if ("error" in result) throw new Error(result.error);
    const next = conversationQuoteFromSelections(quote, selections, result.data);
    if (!next) throw new Error(copy.saveQuoteError);
    setQuotePatches((current) => ({ ...current, [next.id]: next }));
    setSelectedRevisionId(result.data.id);
    setEditing(false);
    const quoteIndex = listedQuotes.findIndex((item) => item.id === quote.id);
    const quoteName = quoteLabel(next, quoteIndex);
    const saved = await recordSystemActivity({
      conversationId: workspace.id,
      kind: "savedRevision",
      name: revisionMenuLabel(result.data.revisionNumber),
      previousName: quoteName,
    });
    if (!("error" in saved)) publishActivity(saved.data);
  }

  async function saveAndShareFocusedQuote(selections: QuoteSelections, renders: QuoteRevisionRenderFiles) {
    await saveFocusedQuote(selections, renders);
    setPhotoPreview(null);
    setPhotoSuggestionChanges(null);
    setDesignPreviewOpen(true);
  }

  async function saveAndReviewFocusedQuote(selections: QuoteSelections, renders: QuoteRevisionRenderFiles) {
    await saveFocusedQuote(selections, renders);
    setReviewImageUrl(null);
    setReviewSuggestionChanges(null);
    setReviewOpen(true);
  }

  async function saveViewedCommunication(communication: QuoteCommunication) {
    if (!viewed) throw new Error(copy.saveQuoteError);
    const result = await saveQuoteCommunication({ revisionId: viewed.id, communication });
    if ("error" in result) throw new Error(result.error);
    setCommunicationPatches((current) => ({ ...current, [viewed.id]: communication }));
  }

  async function sendViewedQuote(communication: QuoteCommunication) {
    const suggestionId = armedQuoteSuggestionId.current;
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
    const next = conversationQuoteWithSentRevision(
      quote,
      result.data.revisionId,
      result.data.updatedAt,
      result.data.sharedQuoteAt || result.data.updatedAt,
    );
    if (!next) throw new Error(copy.sendQuoteError);
    setQuotePatches((current) => ({ ...current, [next.id]: next }));
    setDealStatusPatches((current) => ({ ...current, [focused.deal.id]: result.data.dealStatus }));
    if (armedQuoteSuggestionId.current === suggestionId) armedQuoteSuggestionId.current = null;
    if (suggestionId) await applySuggestionRef.current(suggestionId);
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

  function addAttachmentFiles(files: File[], source?: { quoteId: string; revisionId: string; suggestionId?: string }) {
    if (files.length === 0) return;
    const next = files.map((file) => {
      const id = crypto.randomUUID();
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      return {
        id,
        file,
        previewUrl,
        phase: "uploading" as const,
        progress: 0,
        quoteId: source?.quoteId,
        revisionId: source?.revisionId,
        suggestionId: source?.suggestionId,
      };
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

  function addAttachments(list: FileList | null) {
    addAttachmentFiles(Array.from(list ?? []));
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
      if (item.suggestionId) void applySuggestionRef.current(item.suggestionId);
      if (item.quoteId && item.revisionId) {
        const shared = await shareQuoteRevisionPhotos(item.revisionId);
        if ("error" in shared) {
          setSendError(shared.error);
        } else {
          const quote = quotesByIdRef.current.get(item.quoteId);
          const next = quote
            ? conversationQuoteWithSharedPhotos(quote, item.revisionId, shared.data.sharedPhotosAt)
            : undefined;
          if (next) setQuotePatches((current) => ({ ...current, [next.id]: next }));
        }
      }
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
    const subject = channel === "email" ? emailSubject.trim() : "";
    const pending = attachmentsRef.current.filter((item) => item.phase === "ready");
    const uploading = attachmentsRef.current.some((item) => item.phase === "uploading");
    if (uploading || !threadId || (!text && !subject && pending.length === 0)) return;
    const sentAt = new Date().toISOString();
    const afterPosition = activitiesRef.current.reduce((max, activity) => Math.max(max, activity.position), -1);
    const batch: OutgoingMessage[] = [];
    if (channel === "email") {
      const quoted = pending.find((item) => item.quoteId && item.revisionId);
      const suggested = pending.find((item) => item.suggestionId);
      batch.push({
        id: crypto.randomUUID(),
        kind: "text",
        channel,
        text: emailActivityText({
          subject,
          body: text,
          attachments: pending.map((item) => ({
            id: item.id,
            name: item.file.name || copy.attachment,
            bytes: item.file.size,
            kind: item.file.type.startsWith("image/") ? "image" : "file",
          })),
        }),
        name: "",
        sentAt,
        afterPosition,
        status: "queued",
        error: "",
        quoteId: quoted?.quoteId,
        revisionId: quoted?.revisionId,
        suggestionId: suggested?.suggestionId,
      });
    } else if (text) {
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
    if (channel !== "email") {
      for (const item of pending) {
        batch.push({
          id: item.id,
          kind: item.file.type.startsWith("image/") ? "image" : "file",
          channel,
          text: "",
          name: item.file.name || copy.attachment,
          previewUrl: item.previewUrl,
          quoteId: item.quoteId,
          revisionId: item.revisionId,
          suggestionId: item.suggestionId,
          sentAt,
          afterPosition,
          status: "queued",
          error: "",
        });
      }
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
    if (channel === "email") setEmailSubject("");
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

  function markLost() {
    if (updatingStatus || pendingLostDealId.current || !canMarkDealLost(focused.deal.status)) return;
    const dealId = focused.deal.id;
    const name = (focusedOption?.title || copy.quote).trim();
    pendingLostDealId.current = dealId;
    setStatusError("");
    showNotice(
      copy.dealMarkedLostToast(name),
      async () => {
        if (pendingLostDealId.current === dealId) pendingLostDealId.current = null;
        return true;
      },
      async () => {
        setUpdatingStatus(true);
        const result = await onMarkLost(dealId);
        setUpdatingStatus(false);
        if (pendingLostDealId.current === dealId) pendingLostDealId.current = null;
        if ("error" in result) {
          setStatusError(copy.markAsLostError);
          return null;
        }
        setDealStatusPatches((current) => ({ ...current, [dealId]: "deal_lost" }));
        return null;
      },
      "neutral",
    );
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

  async function dismissDetectedSuggestion(suggestion: ConversationSuggestion) {
    const name = suggestion.intent === "revision" ? copy.configurationDetected : copy.quoteRequested;
    const dismissed = await detectedSuggestions.dismiss(suggestion.id);
    if (!dismissed) return;
    showNotice(
      copy.suggestionDismissed(name),
      () => detectedSuggestions.restore(suggestion),
      async () => null,
    );
  }

  const uploadingAttachment = attachments.some((item) => item.phase === "uploading");
  const canSend =
    !uploadingAttachment &&
    (Boolean(draft.trim()) ||
      (channel === "email" && Boolean(emailSubject.trim())) ||
      attachments.some((item) => item.phase === "ready"));

  const revisionSuggestion = detectedSuggestions.suggestions.find((suggestion) => suggestion.intent === "revision") ?? null;
  const quoteSuggestion = detectedSuggestions.suggestions.find((suggestion) => suggestion.intent === "new_quote") ?? null;
  const suggestionQuotes = listedQuotes.map((quote, index) => ({
    id: quote.id,
    name: quoteLabel(quote, index),
    number: quote.quoteNumber ?? index + 1,
    title: productTitle(quote.specs),
    sharedAt: latestShareAt(quote.revisions.flatMap((revision) => [revision.sharedPhotosAt, revision.sharedQuoteAt])),
  }));
  const quoteTargets = suggestionQuoteTargets(
    suggestionQuotes,
    revisionSuggestion?.messages ?? [],
    viewingQuote?.id ?? focused.quote?.id ?? null,
  );
  const selectedIntentQuoteId =
    intentQuoteChoice &&
    intentQuoteChoice.suggestionId === revisionSuggestion?.id &&
    quoteTargets.quotes.some((quote) => quote.id === intentQuoteChoice.quoteId)
      ? intentQuoteChoice.quoteId
      : quoteTargets.selectedId;
  const intentQuote = listedQuotes.find((quote) => quote.id === selectedIntentQuoteId) ?? viewingQuote ?? focused.quote;
  const intentRevision = intentQuote
    ? intentQuote.id === (viewingQuote?.id ?? focused.quote?.id)
      ? viewed
      : viewedRevision(intentQuote, null)
    : null;
  const proposed =
    intentRevision && revisionSuggestion
      ? selectionsWithConfigChanges(intentRevision.selections, revisionSuggestion.configChanges)
      : null;
  const suggestedChanges = revisionSuggestion ? configChangeRows(revisionSuggestion.configChanges) : [];
  const totals = intentRevision && proposed ? selectionTotals(intentRevision.selections, proposed) : null;
  const nextRevision = intentQuote
    ? Math.max(0, ...intentQuote.revisions.map((revision) => revision.revisionNumber)) + 1
    : 1;

  function showIntentQuote(quoteId: string, revisionId: string | null) {
    const dealId = focusedOption?.id;
    if (!dealId) return;
    setViewingQuoteIds((current) => ({ ...current, [dealId]: quoteId }));
    setSelectedRevisionId(revisionId);
  }

  async function saveDetectedConfiguration() {
    const quote = intentQuote;
    const suggestionId = revisionSuggestion?.id;
    if (!quote || !intentRevision || !proposed || !suggestionId || applyingIntent) return;
    setApplyingIntent(true);
    try {
      if (!sameSelections(intentRevision.selections, proposed)) {
        const capture = suggestionRenderCapture.current;
        if (!capture) throw new Error(copy.saveQuoteError);
        const renders = await capture();
        const result = await saveQuoteSelections({ quoteId: quote.id, selections: proposed, renders });
        if ("error" in result) throw new Error(result.error);
        const next = conversationQuoteFromSelections(quote, proposed, result.data);
        if (!next) throw new Error(copy.saveQuoteError);
        setQuotePatches((current) => ({ ...current, [next.id]: next }));
        showIntentQuote(quote.id, result.data.id);
        const quoteIndex = listedQuotes.findIndex((item) => item.id === quote.id);
        const quoteName = quoteLabel(next, quoteIndex);
        const saved = await recordSystemActivity({
          conversationId: workspace.id,
          kind: "savedRevision",
          name: revisionMenuLabel(result.data.revisionNumber),
          previousName: quoteName,
        });
        if (!("error" in saved)) publishActivity(saved.data);
      } else {
        showIntentQuote(quote.id, intentRevision.id);
      }
      await detectedSuggestions.apply(suggestionId);
    } catch {
      setSendError(copy.saveQuoteError);
    } finally {
      setApplyingIntent(false);
    }
  }

  async function applyDetectedConfiguration(mode: "photos" | "quote") {
    const quote = intentQuote;
    if (!quote || !intentRevision || !proposed || applyingIntent) return;
    if (mode === "photos") {
      armedPhotoSuggestionId.current = revisionSuggestion?.id ?? null;
      setPhotoPreview({ quoteId: quote.id, revision: intentRevision, revisions: quote.revisions, selections: proposed });
      setPhotoSuggestionChanges(revisionSuggestion?.configChanges ?? null);
      setDesignPreviewOpen(true);
      return;
    }
    setApplyingIntent(true);
    try {
      if (!sameSelections(intentRevision.selections, proposed)) {
        const result = await saveQuoteSelections({ quoteId: quote.id, selections: proposed });
        if ("error" in result) throw new Error(result.error);
        const next = conversationQuoteFromSelections(quote, proposed, result.data);
        if (!next) throw new Error(copy.saveQuoteError);
        setQuotePatches((current) => ({ ...current, [next.id]: next }));
        showIntentQuote(quote.id, result.data.id);
      } else {
        showIntentQuote(quote.id, intentRevision.id);
      }
      armedQuoteSuggestionId.current = revisionSuggestion?.id ?? null;
      setReviewImageUrl(revisionSuggestion?.previewImageUrl || suggestionRenderUrl.current);
      setReviewSuggestionChanges(revisionSuggestion?.configChanges ?? null);
      setReviewOpen(true);
    } catch {
      setSendError(copy.saveQuoteError);
    } finally {
      setApplyingIntent(false);
    }
  }

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
                className="ml-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-transparent text-gray-700 transition-colors hover:bg-gray-50"
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
                    src={headerRenderUrl(focused.quote.revisions, viewed)}
                    className="h-full w-full object-contain p-0.5"
                  />
                </div>
                <div className="inline-grid shrink-0 grid-cols-[minmax(22rem,max-content)] gap-1.5">
                  <QuoteMenu
                    quotes={listedQuotes}
                    viewingQuoteId={viewingQuote?.id ?? focused.quote.id}
                    error={revisionError}
                    onViewQuote={viewQuote}
                    onSelectRevision={(id) => void selectRevision(id)}
                  />
                  <div
                    className={`grid w-full items-stretch gap-1.5 ${
                      quoteStatuses[focused.quote.status].actions.length > 1
                        ? "grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                        : "grid-cols-[minmax(0,1fr)_auto]"
                    }`}
                  >
                    <QuoteStatusActions
                      status={focused.quote.status}
                      editing={editing}
                      onAction={runQuoteStatusAction}
                    />
                    <QuoteActionsMenu
                      quoteId={focused.quote.id}
                      pending={quoteAction != null}
                      adding={addingQuote}
                      onAddQuote={() => void addQuote()}
                      onMove={() => void moveFocusedQuote()}
                      onDuplicate={() => void duplicateFocusedQuote()}
                      menuAction={quoteStatuses[focused.quote.status].menu}
                      onMenuAction={() => {
                        const quote = focused.quote;
                        if (!quote) return;
                        const menu = quoteStatuses[quote.status].menu;
                        if (menu?.id === "delete_draft") void deleteFocusedDraft();
                        else void cancelFocusedQuote();
                      }}
                      onCopied={() => {
                        setRevisionError("");
                        setQuoteNote(copy.publishLinkCopied);
                        window.setTimeout(() => {
                          setQuoteNote((current) => (current === copy.publishLinkCopied ? "" : current));
                        }, 2500);
                      }}
                      onCopyError={() => {
                        setQuoteNote("");
                        setRevisionError(copy.copyPublishLinkError);
                      }}
                    />
                  </div>
                  {quoteNote ? <p className="text-[11px] text-gray-500">{quoteNote}</p> : null}
                </div>
              </div>
            ) : null}
          </div>
          {notice ? (
            <Toast
              key={notice.id}
              message={notice.message}
              tone={notice.tone}
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
        ref={composerPane}
        className="shrink-0 border-t border-gray-200 bg-white p-4"
        onSubmit={submitMessage}
      >
        {revisionSuggestion && intentRevision && proposed && totals && suggestedChanges.length > 0 ? (
          <InboundIntentCard
            title={copy.configurationDetected}
            assistant
            quotes={quoteTargets.quotes.map((quote) => ({ id: quote.id, name: quote.name }))}
            selectedQuoteId={intentQuote?.id}
            onSelectQuote={(quoteId) => setIntentQuoteChoice({ suggestionId: revisionSuggestion.id, quoteId })}
            draft={{
              title: revisionMenuLabel(nextRevision),
              price: totals.after.totalLabel,
              priceDelta: estimateDelta(totals.before.total, totals.after.total),
              imageAlt: title || copy.quote,
              image: (
                <ProposedShedRender
                  selections={proposed}
                  alt={title || copy.quote}
                  suggestionId={revisionSuggestion.id}
                  previewImageUrl={revisionSuggestion.previewImageUrl}
                  renderCaptureRef={suggestionRenderCapture}
                  onRenderUrl={(url) => {
                    suggestionRenderUrl.current = url;
                  }}
                  onPreviewSaved={detectedSuggestions.rememberPreview}
                />
              ),
            }}
            changes={suggestedChanges.map((change) => ({
              id: change.id,
              label: change.text,
              tone: change.kind === "added" ? ("add" as const) : ("change" as const),
            }))}
            actionLabel={copy.applyIntentAndShare(revisionMenuLabel(nextRevision))}
            pending={applyingIntent}
            onDismiss={() => void dismissDetectedSuggestion(revisionSuggestion)}
            onApply={() => void saveDetectedConfiguration()}
            onReview={() => {
              if (!proposed || !intentQuote || !intentRevision) return;
              showIntentQuote(intentQuote.id, intentRevision.id);
              setDetailsOpen(false);
              setSuggestedSelections(proposed);
              setEditing(true);
            }}
            onSharePhotos={() => void applyDetectedConfiguration("photos")}
            onShareQuote={() => void applyDetectedConfiguration("quote")}
          />
        ) : null}
        {quoteSuggestion && viewed ? (
          <InboundIntentCard
            title={copy.quoteRequested}
            actionLabel={copy.shareQuote}
            onDismiss={() => void dismissDetectedSuggestion(quoteSuggestion)}
            onShareQuote={() => {
              armedQuoteSuggestionId.current = quoteSuggestion.id;
              setReviewImageUrl(null);
              setReviewSuggestionChanges(null);
              setReviewOpen(true);
            }}
            changes={[]}
          />
        ) : null}
        <div className="mb-2.5 flex items-center">
          <button
            type="button"
            disabled={!viewed}
            onClick={() => {
              armedPhotoSuggestionId.current = null;
              setPhotoPreview(null);
              setPhotoSuggestionChanges(null);
              setDesignPreviewOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 shadow-xs transition-colors hover:bg-gray-50 disabled:opacity-40"
          >
            <Camera className="h-3.5 w-3.5 shrink-0 text-gray-500" strokeWidth={2} aria-hidden="true" />
            <span>{copy.attachDesignPreview}</span>
          </button>
        </div>
        <div
          className={`relative rounded-lg border border-gray-300 bg-white shadow-xs focus-within:border-gray-600 ${
            attachments.length > 0 || channel === "email" ? "flex flex-col" : "flex items-end"
          }`}
        >
          {channel === "email" ? (
            <input
              value={emailSubject}
              onChange={(event) => setEmailSubject(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  composerRef.current?.focus();
                }
              }}
              aria-label={copy.subject}
              placeholder={copy.subject}
              className="w-full border-b border-gray-200 bg-transparent px-3 py-2 text-xs font-medium text-gray-900 outline-none placeholder:text-gray-400"
            />
          ) : null}
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
              key={`${focused.quote.id}:${viewed.id}:${suggestedSelections ? "suggestion" : "saved"}`}
              mode="internal"
              selections={suggestedSelections ?? viewed.selections}
              onSave={saveFocusedQuote}
              onSaveAndShare={saveAndShareFocusedQuote}
              onSaveAndReview={saveAndReviewFocusedQuote}
            />
          </div>
        ) : null}
      </div>
      {designPreviewOpen && focused.quote && viewed ? (
        <DesignPreviewModal
          current={photoPreview?.revision ?? viewed}
          revisions={photoPreview?.revisions ?? focused.quote.revisions}
          selections={photoPreview?.selections}
          suggested={photoSuggestionChanges}
          onClose={() => {
            armedPhotoSuggestionId.current = null;
            setPhotoPreview(null);
            setPhotoSuggestionChanges(null);
            setDesignPreviewOpen(false);
          }}
          onAttach={(file) => {
            const quoteId = photoPreview?.quoteId ?? focused.quote?.id;
            const revisionId = photoPreview?.revision.id ?? viewed.id;
            if (!quoteId) return;
            const suggestionId = armedPhotoSuggestionId.current ?? undefined;
            armedPhotoSuggestionId.current = null;
            setPhotoPreview(null);
            setPhotoSuggestionChanges(null);
            addAttachmentFiles([file], { quoteId, revisionId, suggestionId });
            setDesignPreviewOpen(false);
          }}
        />
      ) : null}
      {reviewOpen && focused.quote && viewed ? (
        <ReviewSendModal
          participants={participants}
          title={title || copy.quote}
          priceLabel={viewed.totalLabel}
          quoteId={focused.quote.id}
          revisionId={viewed.id}
          imageUrl={reviewImageUrl || viewed.renders?.render_small_url || viewed.imageUrl}
          statusLabel={revisionStatusLabel(viewed)}
          current={viewed}
          revisions={focused.quote.revisions}
          suggested={reviewSuggestionChanges}
          communication={communicationPatches[viewed.id] ?? viewed.communication}
          onSave={saveViewedCommunication}
          onSend={sendViewedQuote}
          onClose={() => {
            armedQuoteSuggestionId.current = null;
            setReviewImageUrl(null);
            setReviewSuggestionChanges(null);
            setReviewOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
