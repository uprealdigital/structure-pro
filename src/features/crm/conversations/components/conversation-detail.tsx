"use client";

import { ArrowUpRight, CircleX, EllipsisVertical, Paperclip, Pencil, Phone, Plus, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { BuildingConfigurator } from "@/src/features/cpq/components/building-configurator";
import { activityChannelLabel, ConversationThread } from "@/src/features/crm/conversations/components/conversation-thread";
import { DealMenu } from "@/src/features/crm/conversations/components/deal-menu";
import { DealSummary } from "@/src/features/crm/conversations/components/deal-summary";
import { QuotePanel, QuoteRevisionMenu } from "@/src/features/crm/conversations/components/quote-panel";
import { ReviewSendModal } from "@/src/features/crm/conversations/components/review-send-modal";
import { useConversationActivities } from "@/src/features/crm/conversations/hooks/use-conversation-activities";
import { copy } from "@/src/features/crm/conversations/locales/en";
import { sendConversationQuote, sendManualActivity } from "@/src/features/crm/conversations/server/actions";
import type {
  ComposerChannel,
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
import type { DealStatus } from "@/src/features/crm/deals/types";
import { contactInitials } from "@/src/features/crm/common/utils/formatting";

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

function DealActionsMenu({
  lost,
  pending,
  onMarkLost,
  onReopen,
}: {
  lost: boolean;
  pending: boolean;
  onMarkLost: () => void;
  onReopen: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!menu.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={menu} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={copy.moreDealActions}
        onClick={() => setOpen((value) => !value)}
        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-gray-50/90 text-gray-600 shadow-xs transition-colors hover:bg-gray-100 hover:text-gray-900"
      >
        <EllipsisVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      {open ? (
        <div role="menu" className="absolute top-full left-0 z-50 mt-1.5 w-44 rounded-xl border border-gray-200 bg-white p-1 shadow-xl">
          <button
            type="button"
            role="menuitem"
            disabled={pending}
            onClick={() => {
              setOpen(false);
              if (lost) onReopen();
              else onMarkLost();
            }}
            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium disabled:opacity-50 ${
              lost ? "text-gray-700 hover:bg-gray-50" : "text-red-600 hover:bg-red-50"
            }`}
          >
            {lost ? (
              <RotateCcw className="h-3.5 w-3.5 shrink-0 text-gray-600" aria-hidden="true" />
            ) : (
              <CircleX className="h-3.5 w-3.5 shrink-0 text-red-600" aria-hidden="true" />
            )}
            <span>{lost ? copy.reopenDeal : copy.markAsLost}</span>
          </button>
        </div>
      ) : null}
    </div>
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
    <div className="pointer-events-none absolute -bottom-3 left-0 right-0 z-20 flex justify-center">
      <button
        type="button"
        title={open ? copy.hideDetails : copy.seeDetails}
        aria-label={open ? copy.hideDetails : copy.seeDetails}
        aria-expanded={open}
        onClick={onClick}
        className="pointer-events-auto inline-flex cursor-pointer items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] leading-none font-medium text-gray-500 shadow-xs transition-all group hover:bg-gray-50 hover:text-gray-900 focus:outline-none"
      >
        <svg
          className={`h-3 w-3 shrink-0 text-gray-500 transition-transform duration-200 group-hover:text-gray-900 ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M5 15l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{open ? copy.hideDetails : copy.seeDetails}</span>
      </button>
    </div>
  );
}

export function ConversationDetail({
  workspace,
  onBack,
  onMarkLost,
  onReopen,
}: {
  workspace: ConversationWorkspace;
  onBack: () => void;
  onMarkLost: (dealId: string) => Promise<{ success: true } | { error: string }>;
  onReopen: (
    dealId: string,
  ) => Promise<{ success: true; data: { status: DealStatus } } | { error: string }>;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [focusedDealId, setFocusedDealId] = useState(workspace.deal.id);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [quotePatches, setQuotePatches] = useState<Record<string, ConversationQuote>>({});
  const [dealStatusPatches, setDealStatusPatches] = useState<Record<string, DealStatus>>({});
  const deals = workspace.deals.map((option) => {
    const status = dealStatusPatches[option.id];
    const deal = status
      ? {
          ...option.deal,
          previousStatus: option.deal.status === status ? option.deal.previousStatus : option.deal.status,
          status,
        }
      : option.deal;
    const patch = option.quote ? quotePatches[option.quote.id] : undefined;
    if (!patch && !status) return option;
    return {
      ...option,
      title: patch ? productTitle(patch.specs) || option.title : option.title,
      priceLabel: patch?.totalLabel ?? option.priceLabel,
      stage: deal.status,
      deal,
      quote: patch ?? option.quote,
    };
  });
  const focusedOption = deals.find((deal) => deal.id === focusedDealId) ?? deals[0];
  const focused = focusedOption
    ? { ...workspace, deal: focusedOption.deal, quote: focusedOption.quote }
    : workspace;
  const [draft, setDraft] = useState("");
  const [channel, setChannel] = useState<ComposerChannel>("sms");
  const [channelOpen, setChannelOpen] = useState(false);
  const { activities, setActivities } = useConversationActivities(workspace.id, workspace.activities);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [revisionError, setRevisionError] = useState("");
  const channelMenu = useRef<HTMLDivElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  const specs = focused.quote?.specs ?? [];
  const viewed = viewedRevision(focused.quote, selectedRevisionId);
  const title = productTitle(viewed?.specs ?? specs);
  const channels: ComposerChannel[] = ["sms", "facebook", "email"];

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (!channelMenu.current?.contains(event.target as Node)) setChannelOpen(false);
    }
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  useEffect(() => {
    const pane = thread.current;
    if (pane) pane.scrollTop = pane.scrollHeight;
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
    setDetailsOpen((open) => !open);
  }

  function selectDeal(id: string) {
    setFocusedDealId(id);
    setSelectedRevisionId(null);
    setRevisionError("");
    setEditing(false);
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

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError("");
    const result = await sendManualActivity({ conversationId: workspace.id, text, channel });
    setSending(false);
    if ("error" in result) {
      setSendError(copy.sendFailed);
      return;
    }
    setActivities((current) => [...current, result.data]);
    setDraft("");
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
      <div className="relative z-40 shrink-0">
        <header className="relative z-20 flex flex-row items-center justify-between gap-4 overflow-visible border-b border-gray-200 bg-white px-5 py-3 shadow-xs">
          <div className="flex shrink-0 flex-col items-start justify-start gap-2 p-1">
            <div className="mb-1 lg:hidden">
              <button type="button" onClick={onBack} className="text-xs font-medium text-gray-900">
                {copy.backToList}
              </button>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-100 font-serif text-xs font-bold text-gray-700 shadow-xs">
                {contactInitials(workspace.customer.fullName)}
              </div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-base font-bold tracking-tight text-gray-950">
                  {workspace.customer.fullName}
                </h2>
                <a
                  href={`tel:${workspace.customer.phone}`}
                  aria-label={copy.callNow}
                  title={`${copy.callNow} ${workspace.customer.fullName}`}
                  className="ml-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-900 transition-colors hover:bg-gray-200"
                >
                  <Phone className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                </a>
              </div>
            </div>
            <div className="relative z-40 flex items-center gap-1.5">
              <DealMenu deals={deals} selectedId={focused.deal.id} onSelect={selectDeal} />
              <DealActionsMenu
                lost={focused.deal.status === "deal_lost"}
                pending={updatingStatus}
                onMarkLost={() => void markLost()}
                onReopen={() => void reopen()}
              />
            </div>
            <DealStatusBadge status={focused.deal.status} />
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
          {editing ? null : <DetailsToggle open={detailsOpen} onClick={toggleDetails} />}
        </header>

        {detailsOpen ? (
          <div className="relative z-10 shrink-0 overflow-visible border-b border-gray-200 bg-white shadow-sm">
            <div className="grid grid-cols-1 gap-6 bg-white px-6 py-4 lg:grid-cols-2">
              <DealSummary workspace={focused} />
              <QuotePanel revision={viewed} />
            </div>
          </div>
        ) : null}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div ref={thread} className="min-h-0 flex-1 overflow-y-auto">
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
        <div className="relative flex items-center rounded-lg border border-gray-300 bg-white shadow-xs focus-within:border-black focus-within:ring-2 focus-within:ring-black">
          <button
            type="button"
            title={copy.attach}
            aria-label={copy.attach}
            className="ml-2 shrink-0 rounded p-1.5 text-gray-400 transition-colors hover:text-gray-700"
          >
            <Paperclip className="h-4 w-4" aria-hidden="true" />
          </button>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-label={copy.composerPlaceholder}
            placeholder={copy.composerPlaceholder}
            className="w-full border-0 bg-transparent py-2.5 pr-3.5 pl-2 text-xs text-gray-900 outline-none placeholder:text-gray-400 focus:ring-0"
          />
          <div className="flex items-center space-x-1 pr-2">
            <div ref={channelMenu} className="relative mr-1.5 flex items-center">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={channelOpen}
                aria-label={copy.messageSource}
                onClick={() => setChannelOpen((open) => !open)}
                className="inline-flex items-center gap-1.5 rounded-md bg-transparent px-2.5 py-1.5 text-xs font-semibold text-gray-800 transition-colors hover:bg-gray-100"
              >
                <svg className="h-3.5 w-3.5 shrink-0 text-gray-900" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="font-medium">{activityChannelLabel(channel)}</span>
                <svg className="h-3 w-3 shrink-0 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              </button>
              {channelOpen ? (
                <ul
                  role="listbox"
                  aria-label={copy.messageSource}
                  className="absolute right-0 bottom-full z-30 mb-2 w-36 overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-md"
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
                        className={`block w-full px-3 py-1.5 text-left text-xs ${
                          option === channel ? "bg-gray-100 font-semibold text-gray-900" : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
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
              disabled={sending}
              className="inline-flex items-center gap-1.5 rounded bg-gray-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-black disabled:opacity-60"
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
