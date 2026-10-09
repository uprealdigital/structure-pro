"use client";

import { ChevronLeft, ChevronRight, Filter, Globe, ImageIcon, List, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { copy } from "@/src/features/crm/deals/locales/en";
import type { DealBoardItem, DealSource, DealStage } from "@/src/features/crm/deals/types";
import { contactInitials } from "@/src/features/crm/common/utils/formatting";

const stages: {
  id: DealStage;
  label: string;
  tone: "default" | "won" | "lost";
  badge: string;
}[] = [
  {
    id: "new_lead",
    label: copy.stageNewLeads,
    tone: "default",
    badge: "border-blue-200 bg-blue-50 text-blue-700",
  },
  {
    id: "configured",
    label: copy.stageConfigured,
    tone: "default",
    badge: "border-purple-200 bg-purple-50 text-purple-700",
  },
  {
    id: "quote_sent",
    label: copy.stageQuoteSent,
    tone: "default",
    badge: "border-amber-200 bg-amber-50 text-amber-800",
  },
  {
    id: "contract",
    label: copy.stageContract,
    tone: "default",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  {
    id: "won",
    label: copy.stageWon,
    tone: "won",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    id: "lost",
    label: copy.stageLost,
    tone: "lost",
    badge: "border-gray-200 bg-gray-100 text-gray-600",
  },
];

function stageLabel(stage: DealStage): string {
  return stages.find((item) => item.id === stage)?.label ?? stage;
}

function sourceLabel(source: DealSource): string {
  return source === "yard_preview" ? copy.sourceYardPreview : copy.sourceWebsite;
}

function showsValue(stage: DealStage): boolean {
  return stage === "contract" || stage === "won" || stage === "lost";
}

function valueClass(stage: DealStage): string {
  if (stage === "won") return "text-emerald-700";
  if (stage === "lost") return "text-gray-500";
  return "text-gray-950";
}

function columnClass(tone: "default" | "won" | "lost"): string {
  if (tone === "won") return "border-emerald-200 bg-emerald-50/50";
  if (tone === "lost") return "border-gray-200 bg-gray-100/50 opacity-90";
  return "border-gray-200/90 bg-gray-100/70";
}

function SourceBadge({ source }: { source: DealSource }) {
  const Icon = source === "yard_preview" ? ImageIcon : Globe;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200/80 bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
      <Icon className="h-3 w-3 text-gray-500" strokeWidth={2} aria-hidden="true" />
      {sourceLabel(source)}
    </span>
  );
}

function DealCard({ deal }: { deal: DealBoardItem }) {
  const priced = showsValue(deal.stage) && deal.valueLabel;
  const cardClass =
    deal.stage === "won"
      ? "border-emerald-200 bg-white hover:border-emerald-500 hover:shadow-sm"
      : deal.stage === "lost"
        ? "border-gray-200 bg-white/80 hover:border-gray-400"
        : "border-gray-200/90 bg-white hover:border-gray-400 hover:shadow-sm";

  const body = (
    <>
      {priced ? (
        <span className={`font-serif text-xs font-semibold ${valueClass(deal.stage)}`}>{deal.valueLabel}</span>
      ) : null}
      <span className="mt-1 flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-xs font-semibold text-gray-800">
          {contactInitials(deal.contactName)}
        </span>
        <span className="font-serif text-sm leading-tight font-semibold text-gray-950 group-hover:text-black">
          {deal.contactName}
        </span>
      </span>
      {deal.productName ? (
        <span className="mt-1 block text-xs leading-tight font-medium text-gray-500">{deal.productName}</span>
      ) : null}
      <span className="mt-2 flex items-center border-t border-gray-100 pt-2">
        <SourceBadge source={deal.source} />
      </span>
    </>
  );

  const className = `group block rounded-md border p-3.5 shadow-xs transition-all ${cardClass}`;

  if (!deal.conversationId) return <article className={className}>{body}</article>;

  return (
    <Link
      href={`/crm/conversations?conversation=${encodeURIComponent(deal.conversationId)}`}
      scroll={false}
      aria-label={`${copy.openDeal}: ${deal.contactName}`}
      className={`${className} cursor-pointer`}
    >
      {body}
    </Link>
  );
}

function KanbanIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 4.5v15m6-15v15m-10.5-15h15a1.5 1.5 0 011.5 1.5v12a1.5 1.5 0 01-1.5 1.5h-15a1.5 1.5 0 01-1.5-1.5v-12a1.5 1.5 0 011.5-1.5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DealsBoard({ deals, loadError }: { deals: DealBoardItem[]; loadError: boolean }) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"kanban" | "list">("kanban");
  const scroller = useRef<HTMLDivElement>(null);
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? deals.filter((deal) =>
        [deal.contactName, deal.productName, deal.detail, deal.valueLabel, stageLabel(deal.stage), sourceLabel(deal.source)]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
    : deals;

  function scrollBoard(direction: -1 | 1) {
    scroller.current?.scrollBy({ left: direction * 320, behavior: "smooth" });
  }

  const toggleClass = (active: boolean) =>
    `flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
      active ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
    }`;

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#f9f9fb]">
      <header className="z-10 border-b border-gray-200/80 bg-white px-6 py-4">
        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <label className="relative min-w-0 max-w-lg flex-1">
              <span className="sr-only">{copy.dealSearchPlaceholder}</span>
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.dealSearchPlaceholder}
                className="w-full min-w-0 rounded-md border border-gray-300 bg-gray-50 py-2 pr-4 pl-9 text-xs text-gray-900 transition-colors outline-none placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black"
              />
            </label>
            <button
              type="button"
              className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-md border border-gray-200/80 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-xs transition-colors hover:border-gray-400 hover:bg-gray-50 hover:text-black"
            >
              <Filter className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
              {copy.filters}
            </button>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-100 p-1">
              <button type="button" className={toggleClass(mode === "kanban")} onClick={() => setMode("kanban")}>
                <KanbanIcon />
                {copy.kanban}
              </button>
              <button type="button" className={toggleClass(mode === "list")} onClick={() => setMode("list")}>
                <List className="h-3.5 w-3.5" aria-hidden="true" />
                {copy.listView}
              </button>
            </div>
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#121314] px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-black"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {copy.newDeal}
            </button>
          </div>
        </div>
      </header>

      {loadError ? (
        <div className="flex flex-1 items-center justify-center px-6">
          <p className="text-sm text-gray-500">{copy.dealsLoadError}</p>
        </div>
      ) : deals.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <h2 className="font-serif text-2xl font-semibold text-gray-950">{copy.emptyDeals}</h2>
          <p className="mt-2 max-w-sm text-sm leading-5 text-gray-500">{copy.emptyDealsBody}</p>
        </div>
      ) : mode === "kanban" ? (
        <div className="relative flex min-h-0 flex-1">
          <button
            type="button"
            aria-label={copy.scrollLeft}
            onClick={() => scrollBoard(-1)}
            className="absolute top-1/2 left-3 z-20 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-md transition-all hover:text-black hover:shadow-lg"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={copy.scrollRight}
            onClick={() => scrollBoard(1)}
            className="absolute top-1/2 right-3 z-20 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-md transition-all hover:text-black hover:shadow-lg"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <div
            ref={scroller}
            className="flex h-full min-h-0 flex-1 items-stretch gap-3 overflow-x-auto scroll-smooth p-6"
          >
            {needle && visible.length === 0 ? (
              <p className="px-2 py-6 text-sm text-gray-500">{copy.emptyDealSearch}</p>
            ) : (
              stages.map((stage) => {
                const cards = visible.filter((deal) => deal.stage === stage.id);
                return (
                  <section
                    key={stage.id}
                    aria-label={stage.label}
                    className={`flex h-full max-h-full w-[280px] shrink-0 flex-col rounded-lg border p-3 ${columnClass(stage.tone)}`}
                  >
                    <div
                      className={`mb-3 flex items-center justify-between border-b pb-3 ${
                        stage.tone === "won" ? "border-emerald-200" : "border-gray-200"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-black" aria-hidden="true" />
                        <h3 className="truncate font-serif text-xs font-bold tracking-wide text-black uppercase">
                          {stage.label}
                        </h3>
                        <span className="rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-black">
                          {cards.length}
                        </span>
                      </div>
                    </div>
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 pb-1">
                      {cards.map((deal) => (
                        <DealCard key={deal.id} deal={deal} />
                      ))}
                    </div>
                  </section>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6">
          {visible.length === 0 ? (
            <p className="py-8 text-sm text-gray-500">{copy.emptyDealSearch}</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="border-b border-gray-200 text-[11px] font-bold tracking-wide text-gray-900 select-none">
                    <tr>
                      <th className="py-3.5 pr-4 pl-6 font-serif font-semibold">{copy.columnDealName}</th>
                      <th className="px-4 py-3.5 font-serif font-semibold">{copy.customers}</th>
                      <th className="px-4 py-3.5 font-serif font-semibold">{copy.source}</th>
                      <th className="px-4 py-3.5 font-serif font-semibold">{copy.columnStage}</th>
                      <th className="px-4 py-3.5 font-serif font-semibold">{copy.columnValue}</th>
                      <th className="py-3.5 pr-6 pl-4" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visible.map((deal) => {
                      const stage = stages.find((item) => item.id === deal.stage);
                      const href = deal.conversationId
                        ? `/crm/conversations?conversation=${encodeURIComponent(deal.conversationId)}`
                        : undefined;
                      return (
                        <tr key={deal.id} className="group relative transition-colors hover:bg-gray-50/80">
                          <td className="py-3.5 pr-4 pl-6">
                            {href ? (
                              <Link
                                href={href}
                                scroll={false}
                                aria-label={`${copy.openDeal}: ${deal.productName || deal.contactName}`}
                                className="absolute inset-0"
                              />
                            ) : null}
                            <div className="font-serif font-semibold text-gray-950">{deal.productName || deal.contactName}</div>
                            {deal.detail ? (
                              <div className="font-sans text-[11px] text-gray-400">{deal.detail}</div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center space-x-2">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-xs font-semibold text-gray-800">
                                {contactInitials(deal.contactName)}
                              </span>
                              <span className="text-xs font-medium text-gray-900">{deal.contactName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <SourceBadge source={deal.source} />
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${stage?.badge ?? ""}`}
                            >
                              {stage?.label}
                            </span>
                          </td>
                          <td className={`px-4 py-3.5 font-serif text-xs font-semibold ${valueClass(deal.stage)}`}>
                            {deal.valueLabel || "—"}
                          </td>
                          <td className="py-3.5 pr-6 pl-4 text-right">
                            <ChevronRight className="ml-auto h-4 w-4 text-gray-400 transition-colors group-hover:text-gray-700" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-gray-200/80 px-6 py-4 text-xs text-gray-500">
                <p className="font-medium">
                  {copy.showing} <span className="font-semibold text-gray-900">1</span> {copy.rangeTo}{" "}
                  <span className="font-semibold text-gray-900">{visible.length}</span> {copy.rangeOf}{" "}
                  <span className="font-semibold text-gray-900">{deals.length}</span> {copy.deals.toLowerCase()}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}
