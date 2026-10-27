"use client";

import { Calendar, Check, ChevronDown, ChevronRight, Eye } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { QuoteRevisionRenderFiles } from "@/src/features/cpq/components/building-scene";
import { RevisionRenderSlot } from "@/src/features/crm/conversations/components/proposed-shed-render";
import { copy } from "@/src/features/crm/conversations/locales/en";
import type { ConversationQuote, ConversationQuoteRevision } from "@/src/features/crm/conversations/types";
import {
  formatRevisionDate,
  formatUpdatedAgo,
  quoteMenuName,
  revisionMenuLabel,
} from "@/src/features/crm/conversations/utils/formatting";
import { QuoteStatusBadge } from "@/src/features/crm/quotes/components/quote-status-badge";
import { quoteDisplayName } from "@/src/features/crm/quotes/utils/formatting";
import { specValue } from "@/src/features/crm/common/utils/formatting";

const sectionTitle = "text-sm font-bold tracking-wider text-gray-900 uppercase";

export type MissingRevisionRender = { quoteId: string; revisionId: string };

function RevisionThumb({
  quoteId,
  revision,
  captureRevisionId,
  failedRevisionIds,
  onCaptured,
  onFailed,
}: {
  quoteId: string;
  revision: ConversationQuoteRevision;
  captureRevisionId: string | null;
  failedRevisionIds: Record<string, true>;
  onCaptured: (quoteId: string, revisionId: string, files: QuoteRevisionRenderFiles) => void;
  onFailed: (revisionId: string) => void;
}) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gray-50">
      <RevisionRenderSlot
        revisionId={revision.id}
        imageUrl={revision.renders?.render_small_url}
        selections={revision.selections}
        alt=""
        capture={captureRevisionId === revision.id}
        failed={Boolean(failedRevisionIds[revision.id])}
        progressLabel={copy.renderingRevision}
        onCaptured={(files) => onCaptured(quoteId, revision.id, files)}
        onFailed={() => onFailed(revision.id)}
      />
    </span>
  );
}

function quoteLabel(quote: ConversationQuote, index: number): string {
  return quote.quoteNumber ? quoteDisplayName(quote.quoteNumber, quote.specs) : quoteMenuName(index);
}

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
  captureRevisionId,
  failedRevisionIds,
  onCapture,
  onCaptureFailed,
  onSelect,
}: {
  name: string;
  quote: ConversationQuote;
  viewing: boolean;
  revisionsOpen: boolean;
  captureRevisionId: string | null;
  failedRevisionIds: Record<string, true>;
  onCapture: (quoteId: string, revisionId: string, files: QuoteRevisionRenderFiles) => void;
  onCaptureFailed: (revisionId: string) => void;
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
        <span className="flex w-3.5 shrink-0 items-center justify-center">
          {viewing ? <Eye className="h-3.5 w-3.5 text-black" strokeWidth={2} aria-hidden="true" /> : null}
        </span>
        {current ? (
          <RevisionThumb
            quoteId={quote.id}
            revision={current}
            captureRevisionId={captureRevisionId}
            failedRevisionIds={failedRevisionIds}
            onCaptured={onCapture}
            onFailed={onCaptureFailed}
          />
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="flex min-h-[19px] items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className={`truncate text-xs ${viewing ? "font-bold text-gray-950" : "font-semibold text-gray-900"}`}>
                {name}
              </span>
            </span>
            <span className={`shrink-0 text-xs font-bold ${viewing ? "text-gray-950" : "text-gray-900"}`}>
              {current?.totalLabel ?? quote.totalLabel}
            </span>
          </span>
          <span className="mt-1 flex items-center justify-between gap-3">
            <QuoteStatusBadge status={quote.status} />
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

const summaryTipDelayMs = 600;

function RevisionSummary({ text }: { text: string }) {
  const label = useRef<HTMLSpanElement>(null);
  const tip = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | null>(null);
  const [open, setOpen] = useState(false);

  function cancel() {
    if (timer.current == null) return;
    window.clearTimeout(timer.current);
    timer.current = null;
  }

  function hide() {
    cancel();
    setOpen(false);
  }

  useEffect(() => hide, []);

  useLayoutEffect(() => {
    const node = tip.current;
    const source = label.current;
    if (!open || !node || !source) return;
    const box = source.getBoundingClientRect();
    const width = Math.min(node.offsetWidth, window.innerWidth - 16);
    let left = box.left;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - 8 - width;
    if (left < 8) left = 8;
    let top = box.bottom + 6;
    if (top + node.offsetHeight > window.innerHeight - 8) top = Math.max(8, box.top - node.offsetHeight - 6);
    node.style.left = `${Math.round(left)}px`;
    node.style.top = `${Math.round(top)}px`;
  }, [open, text]);

  useEffect(() => {
    if (!open) return;
    function dismiss() {
      setOpen(false);
    }
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [open]);

  return (
    <>
      <span
        ref={label}
        className="min-w-0 truncate"
        onMouseEnter={() => {
          cancel();
          timer.current = window.setTimeout(() => {
            const node = label.current;
            if (!node || node.scrollWidth <= node.clientWidth + 1) return;
            setOpen(true);
          }, summaryTipDelayMs);
        }}
        onMouseLeave={hide}
      >
        {text}
      </span>
      {open
        ? createPortal(
            <span
              ref={tip}
              role="tooltip"
              className="pointer-events-none fixed z-[80] w-max max-w-80 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] leading-relaxed whitespace-normal text-gray-700 shadow-lg"
            >
              {text}
            </span>,
            document.body,
          )
        : null}
    </>
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
  anchor,
  side,
  top,
  frameRef,
  onSelectRevision,
}: {
  quote: ConversationQuote;
  anchor: "dropdown" | "beside";
  side: "left" | "right";
  top: number;
  frameRef: RefObject<HTMLDivElement | null>;
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
      ref={frameRef}
      role="menu"
      aria-label={copy.revisionsMenu}
      style={anchor === "beside" ? { top } : undefined}
      className={`absolute z-50 rounded-xl border border-gray-200/80 bg-white p-2 text-gray-900 shadow-xl ${
        anchor === "dropdown"
          ? "top-full right-0 mt-1.5 w-full"
          : `w-[23rem] ${side === "left" ? "right-full mr-2" : "left-full ml-2"}`
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
                      <QuoteStatusBadge status={revision.status} />
                    ) : null}
                  </span>
                  <span className={`shrink-0 text-xs font-bold ${active ? "text-gray-950" : "text-gray-900"}`}>
                    {revision.totalLabel}
                  </span>
                </span>
                <span className="mt-1 flex items-center justify-between gap-3 pl-5 text-[11px] text-gray-500">
                  <RevisionSummary text={revision.summary} />
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

function missingRevisionRenders(shown: ConversationQuote[], open: boolean, single: boolean): MissingRevisionRender[] {
  if (!open || single) return [];
  const items: MissingRevisionRender[] = [];
  for (const quote of shown) {
    const current = activeRevision(quote);
    if (!current || current.renders?.render_small_url) continue;
    items.push({ quoteId: quote.id, revisionId: current.id });
  }
  return items;
}

export function QuoteMenu({
  quotes,
  viewingQuoteId,
  error,
  captureRevisionId,
  failedRevisionIds,
  onViewQuote,
  onSelectRevision,
  onMissingRenders,
  onCaptureRenders,
  onCaptureFailed,
}: {
  quotes: ConversationQuote[];
  viewingQuoteId: string;
  error?: string;
  captureRevisionId: string | null;
  failedRevisionIds: Record<string, true>;
  onViewQuote: (id: string) => void;
  onSelectRevision: (id: string) => void;
  onMissingRenders: (items: MissingRevisionRender[]) => void;
  onCaptureRenders: (quoteId: string, revisionId: string, files: QuoteRevisionRenderFiles) => void;
  onCaptureFailed: (revisionId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showVoided, setShowVoided] = useState(false);
  const [revisionsQuoteId, setRevisionsQuoteId] = useState<string | null>(null);
  const [side, setSide] = useState<"left" | "right">("left");
  const [flyoutTop, setFlyoutTop] = useState(0);
  const menu = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const viewingRow = useRef<HTMLLIElement>(null);
  const flyoutFrame = useRef<HTMLDivElement>(null);
  const placeFlyout = useRef<() => void>(() => undefined);
  const viewingIndex = Math.max(
    0,
    quotes.findIndex((quote) => quote.id === viewingQuoteId),
  );
  const viewing = quotes[viewingIndex];
  const current = viewing ? activeRevision(viewing) : undefined;
  const flyout = quotes.find((quote) => quote.id === revisionsQuoteId);
  const voidedCount = quotes.filter((quote) => quote.status === "voided").length;
  const shown = quotes.filter(
    (quote) => showVoided || quote.status !== "voided" || quote.id === viewingQuoteId,
  );
  const single = quotes.length === 1;
  const renderStamp = quotes
    .map((quote) =>
      `${quote.id}:${quote.revisions.map((revision) => `${revision.id}:${revision.renders?.render_small_url ?? ""}`).join(",")}`,
    )
    .join("|");
  const missingRenders = useMemo(
    () => missingRevisionRenders(shown, open, single),
    [renderStamp, open, single, showVoided, viewingQuoteId],
  );
  const missingKey = missingRenders.map((item) => `${item.quoteId}:${item.revisionId}`).join("|");

  useEffect(() => {
    onMissingRenders(open ? missingRenders : []);
  }, [missingKey, open, onMissingRenders]);

  placeFlyout.current = () => {
    const row = viewingRow.current;
    const frame = panel.current;
    if (!row || !frame) return;
    const frameBox = frame.getBoundingClientRect();
    let top = row.getBoundingClientRect().top - frameBox.top;
    const pop = flyoutFrame.current;
    if (pop) {
      const limit = window.innerHeight - 8 - frameBox.top - pop.offsetHeight;
      top = Math.min(top, Math.max(0, limit));
    }
    const next = Math.round(top);
    setFlyoutTop((currentTop) => (currentTop === next ? currentTop : next));
  };

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
    setSide(rect.left >= 384 ? "left" : "right");
    if (list.current && viewingRow.current) revealRevision(list.current, viewingRow.current);
    placeFlyout.current();
  }, [open, flyout, viewingQuoteId, shown.length, showVoided]);

  useEffect(() => {
    const scroller = list.current;
    if (!open || !scroller) return;
    const follow = () => placeFlyout.current();
    scroller.addEventListener("scroll", follow, { passive: true });
    window.addEventListener("resize", follow);
    return () => {
      scroller.removeEventListener("scroll", follow);
      window.removeEventListener("resize", follow);
    };
  }, [open, flyout]);

  if (!viewing) return null;

  return (
    <div ref={menu} className="relative z-40 w-full">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={single ? copy.revisionsMenu : copy.quotesMenu}
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
        className="flex w-full cursor-pointer items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-left whitespace-nowrap shadow-xs transition-colors hover:bg-gray-50"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center justify-between gap-4">
            <span className="min-w-0 truncate text-xs font-semibold text-gray-950" title={quoteLabel(viewing, viewingIndex)}>
              {quoteLabel(viewing, viewingIndex)}
            </span>
            <span className="shrink-0 text-xs font-semibold text-gray-950">{current?.totalLabel ?? viewing.totalLabel}</span>
          </span>
          <span className="flex items-center justify-between gap-3">
            <QuoteStatusBadge status={viewing.status} />
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
      {open && single && flyout ? (
        <RevisionFlyout
          quote={flyout}
          anchor="dropdown"
          side={side}
          top={0}
          frameRef={flyoutFrame}
          onSelectRevision={(id) => {
            onSelectRevision(id);
            setOpen(false);
            setRevisionsQuoteId(null);
          }}
        />
      ) : null}
      {open && !single ? (
        <div
          ref={panel}
          className="absolute top-full right-0 z-50 mt-1.5 w-[27.6rem] rounded-xl border border-gray-200/80 bg-white p-2 text-gray-900 shadow-xl"
        >
          <ul
            ref={list}
            role="menu"
            aria-label={copy.quotesMenu}
            className="max-h-80 space-y-1 overflow-y-auto overscroll-contain"
          >
            {shown.map((quote) => (
              <li key={quote.id} ref={quote.id === viewingQuoteId ? viewingRow : undefined}>
                <QuoteRow
                  name={quoteLabel(quote, Math.max(0, quotes.indexOf(quote)))}
                  quote={quote}
                  viewing={quote.id === viewingQuoteId}
                  revisionsOpen={revisionsQuoteId === quote.id}
                  captureRevisionId={captureRevisionId}
                  failedRevisionIds={failedRevisionIds}
                  onCapture={onCaptureRenders}
                  onCaptureFailed={onCaptureFailed}
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
              anchor="beside"
              side={side}
              top={flyoutTop}
              frameRef={flyoutFrame}
              onSelectRevision={(id) => {
                onSelectRevision(id);
                setOpen(false);
                setRevisionsQuoteId(null);
              }}
            />
          ) : null}
          {voidedCount > 0 ? (
            <div className="mt-1 border-t border-gray-100 px-3 py-2">
              <button
                type="button"
                role="switch"
                aria-checked={showVoided}
                onClick={() => setShowVoided((value) => !value)}
                className="inline-flex cursor-pointer items-center gap-1.5 py-1 text-[11px] font-medium text-gray-600"
              >
                <span className="font-medium text-gray-700">{copy.voidedQuotes}</span>
                <span className="inline-flex items-center justify-center rounded-full bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] leading-none font-medium text-gray-500">
                  {voidedCount}
                </span>
                <span
                  className={`relative h-4 w-7 rounded-full p-0.5 transition-colors ${
                    showVoided ? "bg-gray-900" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`block h-3 w-3 rounded-full bg-white shadow-xs transition-transform ${
                      showVoided ? "translate-x-3" : ""
                    }`}
                  />
                </span>
              </button>
            </div>
          ) : null}
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
