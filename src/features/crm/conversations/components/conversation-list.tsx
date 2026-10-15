"use client";

import { Check, ChevronUp, Filter, RotateCcw, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { copy } from "@/src/features/crm/conversations/locales/en";
import type { ConversationInboxItem } from "@/src/features/crm/conversations/types";
import { formatConversationListTime } from "@/src/features/crm/conversations/utils/formatting";
import { contactInitials } from "@/src/features/crm/common/utils/formatting";
import { DealStatusBadge } from "@/src/features/crm/deals/components/deal-status-badge";
import { dealStatusOptions } from "@/src/features/crm/deals/utils/status";
import type { DealStatus } from "@/src/features/crm/deals/types";

const selectedStatusClass: Record<DealStatus, string> = {
  lead: "border-gray-300 bg-gray-100 text-gray-800 shadow-xs",
  quote_sent: "border-blue-200 bg-blue-50 text-blue-700 shadow-xs",
  quote_viewed: "border-purple-200 bg-purple-50 text-purple-700 shadow-xs",
  partially_signed: "border-amber-200 bg-amber-50 text-amber-800 shadow-xs",
  deal_won: "border-gray-200 bg-gray-50 text-emerald-700 shadow-xs",
  deal_lost: "border-red-200 bg-red-50 text-red-600 shadow-xs",
};

function SectionSelection({
  onSelectAll,
  onDeselectAll,
}: {
  onSelectAll: () => void;
  onDeselectAll: () => void;
}) {
  return (
    <div className="inline-flex shrink-0 overflow-hidden rounded-md border border-gray-200 bg-white">
      <button
        type="button"
        onClick={onSelectAll}
        className="cursor-pointer border-r border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-950"
      >
        {copy.selectAll}
      </button>
      <button
        type="button"
        onClick={onDeselectAll}
        className="cursor-pointer px-2 py-1 text-[10px] font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-950"
      >
        {copy.deselectAll}
      </button>
    </div>
  );
}

export function ConversationList({
  items,
  inboxEmpty,
  query,
  onQueryChange,
  includedStatuses,
  onToggleStatus,
  onClearFilters,
  onResetFilters,
  onSelectAllStatuses,
  onDeselectAllStatuses,
  dealStatusCount,
  activeFilterCount,
  selectedId,
  onSelect,
}: {
  items: ConversationInboxItem[];
  inboxEmpty: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  includedStatuses: DealStatus[];
  onToggleStatus: (status: DealStatus) => void;
  onClearFilters: () => void;
  onResetFilters: () => void;
  onSelectAllStatuses: () => void;
  onDeselectAllStatuses: () => void;
  dealStatusCount: number;
  activeFilterCount: number;
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const filters = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const hideUntilTop = useRef(false);
  const searching = query.trim().length > 0;
  const itemIds = items.map((item) => item.id).join("\n");

  useEffect(() => {
    const scroller = list.current;
    if (!selectedId || !scroller) return;
    const selected = scroller.querySelector<HTMLElement>(
      `[data-conversation-id="${CSS.escape(selectedId)}"]`,
    );
    if (!selected) return;
    const scrollerBox = scroller.getBoundingClientRect();
    const rowBox = selected.getBoundingClientRect();
    if (rowBox.top < scrollerBox.top) scroller.scrollTop += rowBox.top - scrollerBox.top;
    else if (rowBox.bottom > scrollerBox.bottom) scroller.scrollTop += rowBox.bottom - scrollerBox.bottom;
    if (!hideUntilTop.current) setShowBackToTop(scroller.scrollTop > 8);
  }, [selectedId, itemIds]);

  function onListScroll() {
    const top = list.current?.scrollTop ?? 0;
    if (hideUntilTop.current) {
      if (top <= 8) hideUntilTop.current = false;
      setShowBackToTop(false);
      return;
    }
    setShowBackToTop(top > 8);
  }

  function backToTop() {
    hideUntilTop.current = true;
    setShowBackToTop(false);
    list.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!filters.current?.contains(event.target as Node)) setFiltersOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setFiltersOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <section
      className={`${selectedId ? "hidden lg:flex" : "flex"} z-10 min-h-0 w-full shrink-0 flex-col self-stretch overflow-hidden border-r border-gray-200 bg-white lg:w-96`}
    >
      <div className="relative z-30 border-b border-gray-200 px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">{copy.searchPlaceholder}</span>
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
            </span>
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className="w-full rounded-md border border-gray-200 bg-gray-50 py-1.5 pr-3 pl-8 text-xs text-gray-900 transition-colors outline-none placeholder:text-gray-400 focus:border-black focus:ring-1 focus:ring-black"
            />
          </label>
          <div ref={filters} className="relative shrink-0">
            <button
              type="button"
              aria-expanded={filtersOpen}
              aria-haspopup="dialog"
              onClick={() => setFiltersOpen((open) => !open)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-xs transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              <Filter className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
              <span>{copy.filters}</span>
              {activeFilterCount > 0 ? (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#121314] px-1 text-[10px] leading-none font-semibold text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
            {filtersOpen ? (
              <div
                role="dialog"
                aria-label={copy.filters}
                className="absolute top-full right-0 z-40 mt-2 w-80 space-y-3 rounded-xl border border-gray-200 bg-white px-4 pt-4 pb-4 shadow-2xl"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="text-[10px] font-bold tracking-wider text-gray-700 uppercase">
                      {copy.filterDealStatus}
                    </span>
                    {dealStatusCount > 0 ? (
                      <span className="inline-flex items-center justify-center rounded-full bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-gray-600">
                        {dealStatusCount}
                      </span>
                    ) : null}
                  </div>
                  <SectionSelection
                    onSelectAll={onSelectAllStatuses}
                    onDeselectAll={onDeselectAllStatuses}
                  />
                </div>
                <div className="flex flex-wrap gap-2 py-1">
                  {dealStatusOptions.map((option) => {
                    const included = includedStatuses.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={included}
                        onClick={() => onToggleStatus(option.id)}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          included
                            ? selectedStatusClass[option.id]
                            : "border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        }`}
                      >
                        {included ? (
                          <Check className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                        ) : null}
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-gray-950"
                  >
                    <RotateCcw className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden="true" />
                    {copy.resetFilters}
                  </button>
                  <button
                    type="button"
                    onClick={onClearFilters}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 shadow-xs transition-colors hover:bg-gray-100 hover:text-gray-950"
                  >
                    <X className="h-3 w-3 shrink-0 text-gray-500" strokeWidth={2} aria-hidden="true" />
                    {copy.clear}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {inboxEmpty ? (
        <div className="px-4 py-8">
          <p className="text-xs font-semibold text-gray-950">{copy.emptyInbox}</p>
          <p className="mt-1 text-xs text-gray-500">{copy.emptyInboxBody}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="px-4 py-8">
          <p className="text-xs text-gray-500">{searching ? copy.emptySearch : copy.emptyFilter}</p>
        </div>
      ) : (
        <div className="relative min-h-0 flex-1">
          {showBackToTop ? (
            <button
              type="button"
              onClick={backToTop}
              aria-label={copy.backToTop}
              className="absolute top-2 left-1/2 z-20 flex h-7 w-7 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              <ChevronUp className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </button>
          ) : null}
          <ul
            ref={list}
            onScroll={onListScroll}
            className="h-full divide-y divide-gray-100 overflow-y-auto"
            aria-label={copy.conversationList}
          >
          {items.map((item) => {
            const selected = item.id === selectedId;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  data-conversation-id={item.id}
                  onClick={() => onSelect(item.id)}
                  aria-current={selected ? "true" : undefined}
                  className={`block w-full cursor-pointer p-3.5 text-left transition-colors ${
                    selected ? "border-l-4 border-black bg-gray-50/90" : "hover:bg-gray-50/60"
                  }`}
                >
                  <span className="mb-1 flex items-start justify-between">
                    <span className="flex items-center space-x-2.5">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full font-serif text-xs font-bold ${
                          selected ? "bg-[#121314] text-white" : "bg-gray-200 text-gray-800"
                        }`}
                      >
                        {contactInitials(item.contactName)}
                      </span>
                      <span className="min-w-0 truncate text-xs font-bold text-gray-950">{item.contactName}</span>
                    </span>
                    {item.updatedAt ? (
                      <time
                        dateTime={item.updatedAt}
                        className={`shrink-0 text-right text-[10px] leading-tight font-medium whitespace-nowrap ${selected ? "text-gray-500" : "text-gray-400"}`}
                      >
                        {formatConversationListTime(item.updatedAt)}
                      </time>
                    ) : null}
                  </span>
                  <span className="mt-1.5 flex items-end justify-between gap-2.5 pl-10.5">
                    <span
                      className={`min-w-0 flex-1 truncate pr-1 text-xs ${
                        selected ? "font-medium text-gray-700" : "text-gray-500"
                      }`}
                    >
                      {item.preview || copy.noMessages}
                    </span>
                    <span className="flex shrink-0 justify-end">
                      <DealStatusBadge status={item.dealStatus} />
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          </ul>
        </div>
      )}
    </section>
  );
}
