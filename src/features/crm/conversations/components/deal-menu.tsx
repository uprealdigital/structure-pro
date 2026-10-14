"use client";

import { Check, ChevronDown, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { copy } from "@/src/features/crm/conversations/locales/en";
import type { ConversationDealOption } from "@/src/features/crm/conversations/types";
import { orderedDealMenu } from "@/src/features/crm/conversations/utils/deals";
import { dealStatusOption } from "@/src/features/crm/deals/utils/status";

export function DealMenu({
  deals,
  selectedId,
  onSelect,
}: {
  deals: ConversationDealOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showLost, setShowLost] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const selected = deals.find((deal) => deal.id === selectedId) ?? deals[0];
  const lostCount = deals.filter((deal) => deal.stage === "deal_lost").length;
  const visible = orderedDealMenu(deals, showLost);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!menu.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (!selected) return null;

  return (
    <div ref={menu} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          setShowLost(selected.stage === "deal_lost");
          setOpen((value) => !value);
        }}
        className="flex items-center gap-1 text-left"
      >
        <span className="text-xs font-medium tracking-tight text-gray-700">
          {selected.title || copy.quote}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div className="absolute top-full left-0 z-30 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <ul role="listbox" aria-label={copy.dealSummary} className="max-h-80 overflow-y-auto p-1.5">
            {visible.map((deal) => {
              const current = deal.id === selected.id;
              return (
                <li key={deal.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={current}
                    onClick={() => {
                      onSelect(deal.id);
                      setOpen(false);
                    }}
                    className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left ${
                      current ? "bg-gray-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <Check
                      className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${current ? "text-gray-900" : "text-transparent"}`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className={`truncate text-sm ${current ? "font-semibold text-gray-950" : "font-medium text-gray-800"}`}>
                          {deal.title || copy.quote}
                        </span>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${dealStatusOption(deal.stage)?.badge ?? ""}`}
                        >
                          {dealStatusOption(deal.stage)?.label}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2 text-xs text-gray-500">
                        <span>{deal.priceLabel}</span>
                        <span>{deal.dateLabel}</span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-3 py-2">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-[13px] font-medium text-gray-600 hover:text-gray-900"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {copy.createDeal}
            </Link>
            {lostCount > 0 ? (
              <button
                type="button"
                role="switch"
                aria-checked={showLost}
                onClick={() => setShowLost((value) => !value)}
                className="flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-gray-600"
              >
                <span>{copy.lostDeals}</span>
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded bg-gray-200 px-1 text-[11px] leading-none font-semibold text-gray-600">
                  {lostCount}
                </span>
                <span
                  className={`relative h-4 w-7 rounded-full transition-colors ${showLost ? "bg-gray-900" : "bg-gray-300"}`}
                >
                  <span
                    className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${showLost ? "left-3.5" : "left-0.5"}`}
                  />
                </span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
