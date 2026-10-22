"use client";

import { Calendar, Check, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { copy } from "@/src/features/crm/conversations/locales/en";
import type { ConversationQuote, ConversationQuoteRevision } from "@/src/features/crm/conversations/types";
import {
  formatRevisionDate,
  formatUpdatedAgo,
  quoteMenuName,
  revisionMenuLabel,
} from "@/src/features/crm/conversations/utils/formatting";
import type { QuoteRecordStatus } from "@/src/features/crm/quotes/types";
import { specValue } from "@/src/features/crm/common/utils/formatting";

const sectionTitle = "text-sm font-bold tracking-wider text-gray-900 uppercase";

const statusLabel: Record<QuoteRecordStatus, string> = {
  draft: copy.quoteStatusDraft,
  sent: copy.quoteStatusSent,
  signed: copy.quoteStatusSigned,
  declined: copy.quoteStatusDeclined,
  expired: copy.quoteStatusExpired,
  voided: copy.quoteStatusVoided,
};

const statusClass: Record<QuoteRecordStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-50 text-blue-600",
  signed: "bg-emerald-50 text-emerald-700",
  declined: "bg-red-50 text-red-600",
  expired: "bg-gray-100 text-gray-500",
  voided: "bg-gray-100 text-gray-400",
};

function activeRevision(quote: ConversationQuote): ConversationQuoteRevision | undefined {
  return (
    quote.revisions.find((revision) => revision.id === quote.activeRevisionId) ??
    [...quote.revisions].sort((left, right) => right.revisionNumber - left.revisionNumber)[0]
  );
}

function QuoteRow({
  name,
  quote,
  viewing,
  revisionsOpen,
  onSelect,
}: {
  name: string;
  quote: ConversationQuote;
  viewing: boolean;
  revisionsOpen: boolean;
  onSelect: () => void;
}) {
  const current = activeRevision(quote);

  return (
    <button
      type="button"
      role="menuitem"
      aria-current={viewing ? "true" : undefined}
      aria-expanded={revisionsOpen}
      aria-haspopup="menu"
      onClick={onSelect}
      className={`w-full rounded-lg p-2.5 text-left transition-colors ${
        viewing ? "border border-gray-200/60 bg-gray-50" : "border border-transparent hover:bg-gray-50"
      }`}
    >
      <span className="flex items-center gap-2">
        <span className="min-w-0 flex-1">
          <span className="flex min-h-[19px] items-center justify-between gap-3">
            <span className={`flex min-w-0 items-center gap-1.5 ${viewing ? "" : "pl-5"}`}>
              {viewing ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-black" strokeWidth={2.5} aria-hidden="true" />
              ) : null}
              <span className={`truncate text-xs ${viewing ? "font-bold text-gray-950" : "font-semibold text-gray-900"}`}>
                {name}
              </span>
              {viewing ? (
                <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                  {copy.active}
                </span>
              ) : null}
            </span>
            <span className={`shrink-0 text-xs font-bold ${viewing ? "text-gray-950" : "text-gray-900"}`}>
              {current?.totalLabel ?? quote.totalLabel}
            </span>
          </span>
          <span className="mt-1 flex items-center justify-between gap-3 pl-5">
            <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${statusClass[quote.status]}`}>
              {statusLabel[quote.status]}
            </span>
            <span className="text-[11px] font-medium text-gray-500">
              {current ? revisionMenuLabel(current.revisionNumber) : ""}
            </span>
          </span>
        </span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden="true" />
      </span>
    </button>
  );
}

function revealRevision(container: HTMLElement, row: HTMLElement) {
  const containerRect = container.getBoundingClientRect();
  const rowRect = row.getBoundingClientRect();
  const above = containerRect.top - rowRect.top;
  const below = rowRect.bottom - containerRect.bottom;
  if (above <= 1 && below <= 1) return;
  container.scrollTop += above > 1 ? -above : below;
}

function RevisionFlyout({
  quote,
  side,
  onSelectRevision,
}: {
  quote: ConversationQuote;
  side: "left" | "right";
  onSelectRevision: (id: string) => void;
}) {
  const list = useRef<HTMLUListElement>(null);
  const activeRow = useRef<HTMLButtonElement>(null);
  const revisions = [...quote.revisions].sort((left, right) => right.revisionNumber - left.revisionNumber);

  useLayoutEffect(() => {
    if (list.current && activeRow.current) revealRevision(list.current, activeRow.current);
  }, [quote.id, quote.activeRevisionId, revisions.length]);

  return (
    <div
      role="menu"
      aria-label={copy.revisionsMenu}
      className={`absolute top-0 z-50 w-80 rounded-xl border border-gray-200/80 bg-white p-2 text-gray-900 shadow-xl ${
        side === "left" ? "right-full mr-2" : "left-full ml-2"
      }`}
    >
      <ul ref={list} className="max-h-[70vh] space-y-1 overflow-y-auto overscroll-contain">
        {revisions.map((revision) => {
          const active = revision.id === quote.activeRevisionId;
          const dated = revision.createdAt || revision.updatedAt;
          return (
            <li key={revision.id}>
              <button
                ref={active ? activeRow : undefined}
                type="button"
                role="menuitem"
                aria-current={active ? "true" : undefined}
                onClick={() => onSelectRevision(revision.id)}
                className={`w-full rounded-lg p-2.5 text-left transition-colors ${
                  active ? "border border-gray-200/60 bg-gray-50" : "border border-transparent hover:bg-gray-50"
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className={`flex min-w-0 items-center gap-1.5 ${active ? "" : "pl-5"}`}>
                    {active ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-black" strokeWidth={2.5} aria-hidden="true" />
                    ) : null}
                    <span
                      className={`truncate text-xs ${active ? "font-bold text-gray-950" : "font-semibold text-gray-900"}`}
                    >
                      {revisionMenuLabel(revision.revisionNumber)}
                    </span>
                    {active ? (
                      <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                        {copy.active}
                      </span>
                    ) : null}
                  </span>
                  <span className={`shrink-0 text-xs font-bold ${active ? "text-gray-950" : "text-gray-900"}`}>
                    {revision.totalLabel}
                  </span>
                </span>
                <span className="mt-1 flex items-center justify-between gap-3 pl-5 text-[11px] text-gray-500">
                  <span className="min-w-0 truncate">{revision.summary}</span>
                  <span className="shrink-0">{formatRevisionDate(dated)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function QuoteMenu({
  quotes,
  viewingQuoteId,
  error,
  adding,
  onViewQuote,
  onSelectRevision,
  onAddQuote,
}: {
  quotes: ConversationQuote[];
  viewingQuoteId: string;
  error?: string;
  adding?: boolean;
  onViewQuote: (id: string) => void;
  onSelectRevision: (id: string) => void;
  onAddQuote: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [revisionsQuoteId, setRevisionsQuoteId] = useState<string | null>(null);
  const [side, setSide] = useState<"left" | "right">("left");
  const menu = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const viewingIndex = Math.max(
    0,
    quotes.findIndex((quote) => quote.id === viewingQuoteId),
  );
  const viewing = quotes[viewingIndex];
  const current = viewing ? activeRevision(viewing) : undefined;
  const flyout = quotes.find((quote) => quote.id === revisionsQuoteId);

  useEffect(() => {
    if (open) setRevisionsQuoteId(viewingQuoteId);
  }, [open, viewingQuoteId]);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!menu.current?.contains(event.target as Node)) {
        setOpen(false);
        setRevisionsQuoteId(null);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape" || !open) return;
      setOpen(false);
      setRevisionsQuoteId(null);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !flyout || !panel.current) return;
    const rect = panel.current.getBoundingClientRect();
    setSide(rect.left >= 336 ? "left" : "right");
  }, [open, flyout]);

  if (!viewing) return null;

  return (
    <div ref={menu} className="relative z-40">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={copy.quotesMenu}
        onClick={() => {
          setOpen((value) => {
            if (value) {
              setRevisionsQuoteId(null);
              return false;
            }
            setRevisionsQuoteId(viewingQuoteId);
            return true;
          });
        }}
        className="flex w-full cursor-pointer items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-left whitespace-nowrap shadow-xs transition-colors hover:bg-gray-50"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center justify-between gap-4">
            <span className="text-xs font-semibold text-gray-950">{quoteMenuName(viewingIndex)}</span>
            <span className="text-xs font-semibold text-gray-950">{current?.totalLabel ?? viewing.totalLabel}</span>
          </span>
          <span className="flex items-center justify-between gap-3">
            <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${statusClass[viewing.status]}`}>
              {statusLabel[viewing.status]}
            </span>
            <span className="text-[11px] font-medium text-gray-500">
              {current ? revisionMenuLabel(current.revisionNumber) : ""}
            </span>
          </span>
        </span>
        <ChevronDown
          className={`h-3 w-3 shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {error ? <p className="pt-1 text-[11px] text-red-600">{error}</p> : null}
      {open ? (
        <div
          ref={panel}
          className="absolute top-full right-0 z-50 mt-1.5 w-80 rounded-xl border border-gray-200/80 bg-white p-2 text-gray-900 shadow-xl"
        >
          <ul role="menu" aria-label={copy.quotesMenu} className="max-h-80 space-y-1 overflow-y-auto overscroll-contain">
            {quotes.map((quote, index) => (
              <li key={quote.id}>
                <QuoteRow
                  name={quoteMenuName(index)}
                  quote={quote}
                  viewing={quote.id === viewingQuoteId}
                  revisionsOpen={revisionsQuoteId === quote.id}
                  onSelect={() => {
                    if (quote.id === viewingQuoteId) {
                      setRevisionsQuoteId(quote.id);
                      return;
                    }
                    onViewQuote(quote.id);
                    setOpen(false);
                    setRevisionsQuoteId(null);
                  }}
                />
              </li>
            ))}
          </ul>
          {flyout ? (
            <RevisionFlyout
              quote={flyout}
              side={side}
              onSelectRevision={(id) => {
                onSelectRevision(id);
                setOpen(false);
                setRevisionsQuoteId(null);
              }}
            />
          ) : null}
          <div className="mt-1 border-t border-gray-100 pt-1">
            <button
              type="button"
              role="menuitem"
              disabled={adding}
              onClick={onAddQuote}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-default disabled:opacity-60"
            >
              <Plus className="h-3.5 w-3.5 shrink-0 text-gray-500" strokeWidth={2} aria-hidden="true" />
              <span>{adding ? copy.addingQuote : copy.addQuote}</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function QuotePanel({
  revision,
}: {
  revision: ConversationQuoteRevision | null;
}) {
  const updated = revision ? formatUpdatedAgo(revision.updatedAt) : "";
  const delivery = revision ? specValue(revision.specs, "Delivery ZIP") : "";

  return (
    <div className="relative col-span-1 space-y-3.5 pl-4">
      <div className="flex flex-col items-start gap-1">
        <h3 className={sectionTitle}>{copy.quote}</h3>
        {revision && updated ? (
          <span className="text-[10px] leading-none font-normal whitespace-nowrap text-gray-400">
            {copy.updated} {updated}
          </span>
        ) : null}
        {revision ? null : <p className="text-xs text-gray-500">{copy.quoteUnavailable}</p>}
      </div>

      {revision ? (
        <div className="space-y-3 pt-1 text-xs text-gray-700">
          {revision.lines.map((line) => (
            <div key={line.label} className="flex items-baseline justify-between gap-4">
              <span className="text-gray-700">{line.label}</span>
              <span className="font-bold whitespace-nowrap text-gray-950">{line.amountLabel}</span>
            </div>
          ))}
          <div className="flex items-baseline justify-between pt-4 text-xs font-bold text-gray-950">
            <span className="text-[10px] font-bold tracking-wider text-gray-700 uppercase">{copy.totalEstimate}</span>
            <span className="text-sm font-bold text-gray-950">{revision.totalLabel}</span>
          </div>
          {delivery ? (
            <div className="flex items-center gap-2 pt-3 text-xs text-gray-600">
              <Calendar className="h-3.5 w-3.5 text-gray-400" strokeWidth={1.8} aria-hidden="true" />
              <span>
                {copy.deliveryTo} <span className="font-semibold text-gray-800 underline">{delivery}</span>
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
