"use client";

import { ArrowUpRight, ChevronDown, Paperclip, Pencil, Phone } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { activitySourceLabel, ConversationThread } from "@/src/features/crm/conversations/components/conversation-thread";
import { DealSummary } from "@/src/features/crm/conversations/components/deal-summary";
import { QuotePanel } from "@/src/features/crm/conversations/components/quote-panel";
import { copy } from "@/src/features/crm/conversations/locales/en";
import { sendManualActivity } from "@/src/features/crm/conversations/server/actions";
import type { Activity, ComposerSource, ConversationWorkspace } from "@/src/features/crm/conversations/types";
import { productTitle } from "@/src/features/crm/conversations/utils/formatting";
import { contactInitials } from "@/src/features/crm/common/utils/formatting";

function quoteStatus(workspace: ConversationWorkspace): { label: string; sent: boolean } {
  const sent = Boolean(workspace.quote);
  return { label: sent ? copy.quoteSent : copy.statusOpen, sent };
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
}: {
  workspace: ConversationWorkspace;
  onBack: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [source, setSource] = useState<ComposerSource>("sms");
  const [sourceOpen, setSourceOpen] = useState(false);
  const [activities, setActivities] = useState<Activity[]>(workspace.activities);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const sourceMenu = useRef<HTMLDivElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  const specs = workspace.quote?.specs ?? [];
  const title = productTitle(specs);
  const status = quoteStatus(workspace);
  const sources: ComposerSource[] = ["sms", "facebook", "email"];

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (!sourceMenu.current?.contains(event.target as Node)) setSourceOpen(false);
    }
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  useEffect(() => {
    const pane = thread.current;
    if (pane) pane.scrollTop = pane.scrollHeight;
  }, [activities.length]);

  function toggleDetails() {
    setDetailsOpen((open) => !open);
  }

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError("");
    const result = await sendManualActivity({ conversationId: workspace.id, text, source });
    setSending(false);
    if ("error" in result) {
      setSendError(copy.sendFailed);
      return;
    }
    setActivities((current) => [...current, result.data]);
    setDraft("");
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#f9f9fb]">
      <div className="relative z-20 shrink-0">
        <header className="relative flex flex-row items-center justify-between gap-4 overflow-visible border-b border-gray-200 bg-white px-5 py-3 shadow-xs">
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
                <button
                  type="button"
                  onClick={toggleDetails}
                  aria-expanded={detailsOpen}
                  className="group flex items-center gap-1 text-left focus:outline-none"
                >
                  <h2 className="font-serif text-base font-bold tracking-tight text-gray-950 transition-colors group-hover:text-gray-700">
                    {workspace.customer.fullName}
                  </h2>
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 text-gray-500 transition-transform group-hover:text-black ${
                      detailsOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>
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
            <button type="button" onClick={toggleDetails} className="text-left">
              <span className="text-xs font-medium tracking-tight text-gray-700">
                {title || copy.quote}
              </span>
            </button>
            <span
              className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium shadow-xs ${
                status.sent
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-gray-200 bg-gray-50 text-gray-700"
              }`}
            >
              {status.label}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            {workspace.quote ? (
              <div className="flex flex-row items-center gap-3 p-1">
                <div className="flex shrink-0 flex-col items-center gap-1">
                  <div className="relative flex h-16 w-20 items-center justify-center overflow-hidden rounded-lg">
                    <img
                      alt={title || copy.quote}
                      src={workspace.quote.imageUrl}
                      className="h-full w-full object-contain p-0.5"
                    />
                  </div>
                  <span className="pt-0.5 text-base leading-none font-semibold tracking-tight text-gray-950">
                    {workspace.quote.totalLabel}
                  </span>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-900 shadow-xs transition-colors hover:bg-gray-50"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{copy.send}</span>
                  </button>
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-xs transition-colors hover:bg-gray-50"
                  >
                    <Pencil className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden="true" />
                    <span>{copy.modify}</span>
                  </Link>
                  {status.sent ? (
                    <div className="mt-0.5 inline-flex items-center justify-center rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 shadow-xs">
                      {copy.sent}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="max-w-48 text-right text-xs text-gray-500">{copy.quoteUnavailable}</p>
            )}
          </div>
        </header>

        {detailsOpen ? (
          <div className="relative z-10 shrink-0 overflow-visible border-b border-gray-200 bg-white shadow-sm">
            <div className="grid grid-cols-1 gap-6 bg-white px-6 py-4 lg:grid-cols-2">
              <DealSummary workspace={workspace} />
              <QuotePanel quote={workspace.quote} />
            </div>
          </div>
        ) : null}

        <DetailsToggle open={detailsOpen} onClick={toggleDetails} />
      </div>

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
            <div ref={sourceMenu} className="relative mr-1.5 flex items-center">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={sourceOpen}
                aria-label={copy.messageSource}
                onClick={() => setSourceOpen((open) => !open)}
                className="inline-flex items-center gap-1.5 rounded-md bg-transparent px-2.5 py-1.5 text-xs font-semibold text-gray-800 transition-colors hover:bg-gray-100"
              >
                <svg className="h-3.5 w-3.5 shrink-0 text-gray-900" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="font-medium">{activitySourceLabel(source)}</span>
                <svg className="h-3 w-3 shrink-0 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              </button>
              {sourceOpen ? (
                <ul
                  role="listbox"
                  aria-label={copy.messageSource}
                  className="absolute right-0 bottom-full z-30 mb-2 w-36 overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-md"
                >
                  {sources.map((option) => (
                    <li key={option}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={option === source}
                        onClick={() => {
                          setSource(option);
                          setSourceOpen(false);
                        }}
                        className={`block w-full px-3 py-1.5 text-left text-xs ${
                          option === source ? "bg-gray-100 font-semibold text-gray-900" : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {activitySourceLabel(option)}
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
    </div>
  );
}
