"use client";

import { Calendar, Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRevisionMenuHeight } from "@/src/features/crm/conversations/hooks/use-revision-menu-height";
import { copy } from "@/src/features/crm/conversations/locales/en";
import type { ConversationQuoteRevision } from "@/src/features/crm/conversations/types";
import { formatDealMenuDate, formatUpdatedAgo, revisionVersionLabel } from "@/src/features/crm/conversations/utils/formatting";
import { specValue } from "@/src/features/crm/common/utils/formatting";

const sectionTitle = "text-sm font-bold tracking-wider text-gray-900 uppercase";

function RevisionSectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5">
      <span className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase">{label}</span>
      <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-gray-600 tabular-nums">
        {count}
      </span>
    </div>
  );
}

function RevisionRow({
  revision,
  active,
  selected,
  onSelect,
}: {
  revision: ConversationQuoteRevision;
  active: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const name = revisionVersionLabel(revision.status, revision.revisionNumber);

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={`w-full rounded-lg p-2.5 text-left transition-colors ${
        selected ? "border border-gray-200/60 bg-gray-50" : "border border-transparent hover:bg-gray-50"
      }`}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1.5">
          {selected ? (
            <Check className="h-3.5 w-3.5 shrink-0 text-black" strokeWidth={2.5} aria-hidden="true" />
          ) : (
            <span className="w-3.5 shrink-0" aria-hidden="true" />
          )}
          <span className={`truncate text-xs ${selected ? "font-bold text-gray-950" : "font-semibold text-gray-900"}`}>
            {name}
          </span>
          {active ? (
            <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
              {copy.revisionCurrent}
            </span>
          ) : null}
        </span>
        <span className={`shrink-0 text-xs font-bold ${selected ? "text-gray-950" : "text-gray-900"}`}>
          {revision.totalLabel}
        </span>
      </span>
      <span className="mt-1 block pl-5 text-[11px] font-medium text-gray-600">
        {formatDealMenuDate(revision.createdAt || revision.updatedAt)}
      </span>
    </button>
  );
}

export function QuoteRevisionMenu({
  revisions,
  activeRevisionId,
  revision,
  error,
  onSelectRevision,
}: {
  revisions: ConversationQuoteRevision[];
  activeRevisionId: string;
  revision: ConversationQuoteRevision;
  error?: string;
  onSelectRevision: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const drafts = revisions
    .filter((item) => item.status === "draft")
    .sort((left, right) => right.revisionNumber - left.revisionNumber);
  const sent = revisions
    .filter((item) => item.status === "sent")
    .sort((left, right) => right.revisionNumber - left.revisionNumber);
  const { panelRef, draftListRef, sentListRef, limits } = useRevisionMenuHeight(
    open,
    drafts.length,
    sent.length,
    revision.id,
  );

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!menu.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={menu} className="relative z-40">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex w-full cursor-pointer items-center justify-between gap-1.5 rounded-full bg-gray-50/90 px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-gray-950 shadow-xs transition-colors hover:bg-gray-100"
      >
        <span>
          {revisionVersionLabel(revision.status, revision.revisionNumber)} - {revision.totalLabel}
        </span>
        <ChevronDown
          className={`h-3 w-3 shrink-0 text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {error ? <p className="pt-1 text-[11px] text-red-600">{error}</p> : null}
      {open ? (
        <div
          ref={panelRef}
          className="absolute top-full right-0 z-50 mt-1.5 w-80 rounded-xl border border-gray-200/80 bg-white p-2 text-gray-900 shadow-xl"
          style={limits.menu > 0 ? { maxHeight: limits.menu } : undefined}
        >
          <RevisionSectionLabel label={copy.draftRevisions} count={drafts.length} />
          <ul
            ref={draftListRef}
            role="listbox"
            aria-label={copy.draftRevisions}
            className={`space-y-1 ${limits.draft ? "overflow-y-auto overscroll-contain" : ""}`}
            style={limits.draft ? { maxHeight: limits.draft } : undefined}
          >
            {drafts.map((item) => (
              <li key={item.id} data-revision-id={item.id}>
                <RevisionRow
                  revision={item}
                  active={item.id === activeRevisionId}
                  selected={item.id === revision.id}
                  onSelect={() => {
                    onSelectRevision(item.id);
                    setOpen(false);
                  }}
                />
              </li>
            ))}
          </ul>
          <div className="my-1 border-t border-gray-100" />
          <RevisionSectionLabel label={copy.sentQuotes} count={sent.length} />
          {sent.length === 0 ? (
            <p className="px-2.5 pb-1 text-[11px] text-gray-400">{copy.noSentQuotes}</p>
          ) : (
            <ul
              ref={sentListRef}
              role="listbox"
              aria-label={copy.sentQuotes}
              className={`space-y-1 ${limits.sent ? "overflow-y-auto overscroll-contain" : ""}`}
              style={limits.sent ? { maxHeight: limits.sent } : undefined}
            >
              {sent.map((item) => (
                <li key={item.id} data-revision-id={item.id}>
                  <RevisionRow
                    revision={item}
                    active={item.id === activeRevisionId}
                    selected={item.id === revision.id}
                    onSelect={() => {
                      onSelectRevision(item.id);
                      setOpen(false);
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
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
