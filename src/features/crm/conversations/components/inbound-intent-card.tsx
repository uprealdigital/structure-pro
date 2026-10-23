"use client";

import { ArrowLeftRight, ArrowUpRight, Calculator, Camera, Check, ChevronDown, DollarSign, Pencil, Settings, Star, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { copy } from "@/src/features/crm/conversations/locales/en";

export type IntentChangeRow = {
  id: string;
  label: string;
  tone: "add" | "change" | "price";
};

export function InboundIntentCard({
  title,
  assistant,
  summary,
  draft,
  quotes,
  selectedQuoteId,
  onSelectQuote,
  changes,
  actionLabel,
  pending,
  onDismiss,
  onApply,
  onReview,
  onSharePhotos,
  onShareQuote,
}: {
  title: string;
  assistant?: boolean;
  summary?: string;
  draft?: {
    title: string;
    price: string;
    priceDelta?: string;
    imageUrl?: string;
    imageAlt?: string;
    image?: ReactNode;
  };
  quotes?: { id: string; name: string }[];
  selectedQuoteId?: string;
  onSelectQuote?: (id: string) => void;
  changes: IntentChangeRow[];
  actionLabel: string;
  pending?: boolean;
  onDismiss: () => void;
  onApply?: () => void;
  onReview?: () => void;
  onSharePhotos?: () => void;
  onShareQuote: () => void;
}) {
  return (
    <section className="mb-2.5 rounded-xl border border-gray-200 border-l-[3px] border-l-violet-500 bg-white p-3 shadow-xs">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
          {assistant ? (
            <Settings className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          ) : (
            <Star className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true" />
          )}
        </span>
        <h3 className="truncate text-xs font-semibold text-gray-950">{title}</h3>
        {assistant ? (
          <span className="inline-flex shrink-0 items-center rounded-full border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap text-purple-700">
            {copy.aiAssistant}
          </span>
        ) : null}
        <span className="min-w-0 flex-1" />
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <span>{copy.dismiss}</span>
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      {draft ? (
        <div className="mt-3 w-5/8 rounded-lg border border-gray-200 bg-gray-50 p-2.5">
          {quotes && quotes.length > 0 && selectedQuoteId ? (
            <QuoteTarget
              quotes={quotes}
              selectedId={selectedQuoteId}
              pending={pending}
              onSelect={onSelectQuote}
            />
          ) : null}
          <div className="mt-2 flex items-start gap-4">
            <div className="flex items-center gap-3">
              <div className="h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-white">
                {draft.image ??
                  (draft.imageUrl ? (
                    <img alt={draft.imageAlt ?? ""} src={draft.imageUrl} className="h-full w-full object-contain p-0.5" />
                  ) : null)}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-950">{draft.title}</p>
                <p className="mt-0.5 flex items-baseline gap-1.5 text-xs font-medium text-gray-800">
                  <span>{draft.price}</span>
                  {draft.priceDelta ? (
                    <span className={draft.priceDelta === "$0" ? "text-gray-500" : "text-emerald-600"}>
                      ({draft.priceDelta})
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
            {changes.length > 0 ? (
              <div className="ml-auto min-w-0 max-w-sm flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <h4 className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">{copy.suggestedChanges}</h4>
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gray-200 px-1 text-[10px] font-semibold text-gray-600">
                    {changes.length}
                  </span>
                </div>
                <ul
                  className={`space-y-1.5 ${changes.length > 4 ? "max-h-[calc(4.5*1.25rem+4*0.375rem)] overflow-y-scroll overscroll-contain pr-2" : ""}`}
                >
                  {changes.map((change) => (
                    <li key={change.id} className="flex items-start gap-2 text-xs leading-5 font-normal text-gray-950">
                      <ChangeIcon tone={change.tone} />
                      <span>{change.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : summary ? (
        <p className="mt-3 text-xs leading-5 text-gray-600">{summary}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <IntentShareMenu label={actionLabel} pending={pending} onSharePhotos={onSharePhotos} onShareQuote={onShareQuote} />
        {onApply ? (
          <button
            type="button"
            disabled={pending}
            onClick={onApply}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium whitespace-nowrap text-gray-900 shadow-xs hover:bg-gray-50 disabled:opacity-60"
          >
            <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
            {copy.applySuggestion}
          </button>
        ) : null}
        {onReview ? (
          <button
            type="button"
            disabled={pending}
            onClick={onReview}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium whitespace-nowrap text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60"
          >
            <Pencil className="h-3.5 w-3.5 shrink-0 text-gray-500" strokeWidth={1.8} aria-hidden="true" />
            {copy.reviewSuggestedChanges}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function QuoteTarget({
  quotes,
  selectedId,
  pending,
  onSelect,
}: {
  quotes: { id: string; name: string }[];
  selectedId: string;
  pending?: boolean;
  onSelect?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const selected = quotes.find((quote) => quote.id === selectedId) ?? quotes[0];

  useEffect(() => {
    if (!open) return;
    function close(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!selected) return null;
  if (quotes.length < 2 || !onSelect) {
    return <p className="text-[11px] font-semibold text-gray-950">{selected.name}</p>;
  }

  return (
    <div ref={menuRef} className="relative w-full">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-950 shadow-xs hover:bg-gray-50 disabled:opacity-60"
      >
        <span>{selected.name}</span>
        <ChevronDown className={`h-3 w-3 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label={copy.quotesMenu}
          className="absolute top-full left-0 z-40 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          {quotes.map((quote) => (
            <li key={quote.id}>
              <button
                type="button"
                role="option"
                aria-selected={quote.id === selected.id}
                onClick={() => {
                  setOpen(false);
                  onSelect(quote.id);
                }}
                className={`flex w-full items-center px-2.5 py-1.5 text-left text-[11px] font-medium whitespace-nowrap ${
                  quote.id === selected.id ? "bg-gray-100 text-gray-950" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {quote.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ChangeIcon({ tone }: { tone: IntentChangeRow["tone"] }) {
  const className = "mt-0.5 h-3.5 w-3.5 shrink-0";
  if (tone === "price") return <DollarSign className={className} strokeWidth={1.5} aria-hidden="true" />;
  return <ArrowLeftRight className={className} strokeWidth={1.5} aria-hidden="true" />;
}

function IntentShareMenu({
  label,
  pending,
  onSharePhotos,
  onShareQuote,
}: {
  label: string;
  pending?: boolean;
  onSharePhotos?: () => void;
  onShareQuote: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (pending) setOpen(false);
  }, [pending]);

  function choose(action: () => void) {
    setOpen(false);
    action();
  }

  if (!onSharePhotos) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={onShareQuote}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-black px-3 py-2 text-xs font-medium whitespace-nowrap text-white shadow-xs hover:bg-gray-800 disabled:opacity-60"
      >
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3 py-2 text-xs font-medium whitespace-nowrap text-white shadow-xs hover:bg-gray-800 disabled:opacity-60"
      >
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{label}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute left-0 bottom-full z-40 mb-1 w-max min-w-full overflow-hidden rounded-lg border border-gray-200 bg-white py-1 text-left shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onSharePhotos)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium whitespace-nowrap text-gray-900 hover:bg-gray-50"
          >
            <Camera className="h-3.5 w-3.5 shrink-0 text-gray-500" strokeWidth={1.8} aria-hidden="true" />
            <span className="min-w-0 flex-1">{copy.sharePhotos}</span>
            <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
              {copy.sharePhotosBadge}
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onShareQuote)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium whitespace-nowrap text-gray-900 hover:bg-gray-50"
          >
            <Calculator className="h-3.5 w-3.5 shrink-0 text-gray-500" strokeWidth={1.8} aria-hidden="true" />
            <span className="min-w-0 flex-1">{copy.shareQuote}</span>
            <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
              {copy.shareQuoteBadge}
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
