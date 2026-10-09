"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { copy } from "@/src/features/crm/conversations/locales/en";
import type { ConversationInboxItem } from "@/src/features/crm/conversations/types";
import { formatConversationTime } from "@/src/features/crm/conversations/utils/formatting";
import { contactInitials } from "@/src/features/crm/common/utils/formatting";

export function ConversationList({
  inbox,
  selectedId,
  onSelect,
}: {
  inbox: ConversationInboxItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? inbox.filter((item) =>
        [item.contactName, item.contactPhone, item.contactEmail, item.preview]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
    : inbox;

  return (
    <section
      className={`${selectedId ? "hidden lg:flex" : "flex"} z-10 h-full min-h-0 w-full shrink-0 flex-col border-r border-gray-200 bg-white lg:w-96`}
    >
      <div className="border-b border-gray-200 px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">{copy.searchPlaceholder}</span>
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className="w-full rounded-md border border-gray-200 bg-gray-50 py-1.5 pr-3 pl-8 text-xs text-gray-900 transition-colors outline-none placeholder:text-gray-400 focus:border-black focus:ring-1 focus:ring-black"
            />
          </label>
          <button
            type="button"
            className="relative inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 shadow-xs transition-colors"
          >
            <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" fill="#dc2626" />
              <path d="M12 7v6" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="16.5" r="1" fill="#ffffff" />
            </svg>
            <span className="text-[11px] font-semibold whitespace-nowrap text-gray-900">{copy.actions}</span>
          </button>
        </div>
      </div>

      {inbox.length === 0 ? (
        <div className="px-4 py-8">
          <p className="text-xs font-semibold text-gray-950">{copy.emptyInbox}</p>
          <p className="mt-1 text-xs text-gray-500">{copy.emptyInboxBody}</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="px-4 py-8">
          <p className="text-xs text-gray-500">{copy.emptySearch}</p>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto" aria-label={copy.conversationList}>
          {visible.map((item) => {
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
