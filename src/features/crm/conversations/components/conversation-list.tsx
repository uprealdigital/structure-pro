"use client";

import { Filter, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { copy } from "@/src/features/crm/conversations/locales/en";
import type { ConversationInboxItem } from "@/src/features/crm/conversations/types";
import { formatConversationTime } from "@/src/features/crm/conversations/utils/formatting";
import { contactInitials } from "@/src/features/crm/common/utils/formatting";
import { dealStatusOptions } from "@/src/features/crm/deals/utils/status";
import type { DealStatus } from "@/src/features/crm/deals/types";

export function ConversationList({
  items,
  inboxEmpty,
  query,
  onQueryChange,
  includedStatuses,
  onToggleStatus,
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
  activeFilterCount: number;
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filters = useRef<HTMLDivElement>(null);
  const searching = query.trim().length > 0;

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
      className={`${selectedId ? "hidden lg:flex" : "flex"} z-10 h-full min-h-0 w-full shrink-0 flex-col border-r border-gray-200 bg-white lg:w-96`}
    >
      <div className="relative z-20 border-b border-gray-200 px-4 pt-4 pb-3">
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
                className="absolute top-full right-0 z-30 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-lg"
              >
                <p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
                  {copy.filterDealStatus}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {dealStatusOptions.map((option) => {
                    const included = includedStatuses.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={included}
                        onClick={() => onToggleStatus(option.id)}
                        className={`cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          included ? option.badge : "border-gray-200 bg-white text-gray-400 hover:bg-gray-50"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
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
        <ul className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto" aria-label={copy.conversationList}>
          {items.map((item) => {
            const selected = item.id === selectedId;
            return (
              <li key={item.id}>
                <button
                  type="button"
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
                      <span className="text-xs font-bold text-gray-950">{item.contactName}</span>
                    </span>
                    <time
                      dateTime={item.updatedAt}
                      className={`shrink-0 text-[10px] font-medium ${selected ? "text-gray-500" : "text-gray-400"}`}
                    >
                      {formatConversationTime(item.updatedAt)}
                    </time>
                  </span>
                  <span
                    className={`mt-1.5 block pl-10.5 text-xs ${
                      selected
                        ? "line-clamp-2 font-medium text-gray-700"
                        : "mt-1 line-clamp-1 text-gray-500"
                    }`}
                  >
                    {item.preview || copy.noMessages}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
