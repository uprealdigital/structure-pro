"use client";

import { ChevronLeft, ChevronRight, Filter, Footprints, Globe, ImageIcon, List, Plus, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Toast } from "@/src/common/components/toast";
import { useBoardScroll } from "@/src/features/crm/deals/hooks/use-board-scroll";
import { useCreateWalkInDeal } from "@/src/features/crm/deals/hooks/use-create-walk-in-deal";
import { useDealStream } from "@/src/features/crm/deals/hooks/use-deal-stream";
import { CreateWalkInDealSheet } from "@/src/features/crm/deals/components/create-walk-in-deal-sheet";
import { DealStatusBadge } from "@/src/features/crm/deals/components/deal-status-badge";
import { DealsSkeleton } from "@/src/features/crm/deals/components/deals-skeleton";
import { copy } from "@/src/features/crm/deals/locales/en";
import { dealListResponseSchema, type DealListWire, type DealSource, type DealStatus } from "@/src/features/crm/deals/types";
import { dealStatusOption, dealStatusOptions, type DealStatusOption } from "@/src/features/crm/deals/utils/status";
import { useReserveCrmMobileNavSpace } from "@/src/features/crm/common/hooks/use-crm-mobile-nav";
import { contactInitials } from "@/src/features/crm/common/utils/formatting";

function customerNames(deal: DealListWire): string {
  return deal.customers.map((customer) => customer.full_name).join(", ");
}

function stageLabel(stage: DealStatus): string {
  return dealStatusOption(stage)?.label ?? stage;
}

function sourceLabel(source: DealSource): string {
  if (source === "yard_preview") return copy.sourceYardPreview;
  if (source === "walk_in") return copy.sourceWalkIn;
  return copy.sourceWebsite;
}

function sourceIcon(source: DealSource) {
  if (source === "yard_preview") return ImageIcon;
  if (source === "walk_in") return Footprints;
  return Globe;
}

function columnClass(tone: DealStatusOption["tone"]): string {
  if (tone === "won") return "border-emerald-200 bg-emerald-50/50";
  if (tone === "lost") return "border-red-100 bg-red-50/40";
  return "border-gray-200/90 bg-gray-100/70";
}

function SourceBadge({ source }: { source: DealSource }) {
  const Icon = sourceIcon(source);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200/80 bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
      <Icon className="h-3 w-3 text-gray-500" strokeWidth={2} aria-hidden="true" />
      {sourceLabel(source)}
    </span>
  );
}

function DealCard({ deal }: { deal: DealListWire }) {
  const names = customerNames(deal);
  const cardClass =
    deal.status === "deal_won"
      ? "border-emerald-200 bg-white"
      : deal.status === "deal_lost"
        ? "border-gray-200 bg-white/80"
        : "border-gray-200/90 bg-white";

  return (
    <article className={`block rounded-md border p-3.5 shadow-xs ${cardClass}`}>
      <span className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-xs font-semibold text-gray-800">
          {contactInitials(names)}
        </span>
        <span className="font-serif text-sm leading-tight font-semibold text-gray-950">{names}</span>
      </span>
      {deal.name ? (
        <span className="mt-1 block text-xs leading-tight font-medium text-gray-500">{deal.name}</span>
      ) : null}
      <span className="mt-2 flex items-center border-t border-gray-100 pt-2">
        <SourceBadge source={deal.source} />
      </span>
    </article>
  );
}

function DealListMobileRow({ deal }: { deal: DealListWire }) {
  const customers = deal.customers;
  const primary = customers[0];
  const extra = Math.max(0, customers.length - 1);
  const stage = dealStatusOption(deal.status);
  const name = deal.name || customerNames(deal);
  const Icon = sourceIcon(deal.source);
  return (
    <article className="block border-b border-gray-100 px-4 py-3">
      <div className="grid grid-cols-[minmax(0,1fr)_5rem] items-center gap-x-2">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          {customers.length > 0 ? (
            <span className="flex shrink-0 items-center -space-x-2">
                {customers.map((customer, index) => (
                <span
                  key={customer.id}
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-xs font-semibold text-gray-800 ring-1 ring-gray-200"
                  style={{ zIndex: customers.length - index }}
                >
                  {contactInitials(customer.full_name)}
                </span>
              ))}
            </span>
          ) : null}
          {primary ? (
            <span className="truncate font-serif text-xs font-semibold text-gray-950">{primary.full_name}</span>
          ) : null}
          {extra > 0 ? <span className="shrink-0 font-serif text-xs font-semibold text-gray-500">+{extra}</span> : null}
        </div>
        <div className="mt-1 truncate text-xs font-medium text-gray-900">{name}</div>
      </div>
      <div className="flex w-[5rem] flex-col items-start gap-1">
        <span className="inline-flex items-center gap-1 text-[10px] font-medium whitespace-nowrap text-gray-600">
          <Icon className="h-3 w-3 shrink-0 text-gray-500" strokeWidth={2} aria-hidden="true" />
          {sourceLabel(deal.source)}
        </span>
        <span
          className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap ${stage?.badge ?? ""}`}
        >
          {stage?.label}
        </span>
      </div>
    </div>
    </article>
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

export function DealsBoard() {
  const createDeal = useCreateWalkInDeal();
  const [deals, setDeals] = useState<DealListWire[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"kanban" | "list">("kanban");
  useReserveCrmMobileNavSpace(mode !== "list");
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/crm/deals")
      .then(async (response) => {
        if (!response.ok) throw new Error("load");
        return response.json();
      })
      .then((payload) => {
        if (cancelled) return;
        const parsed = dealListResponseSchema.safeParse(payload);
        if (!parsed.success) throw new Error("load");
        setDeals(parsed.data.deals);
        setLoadError(false);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useDealStream((event) => {
    if (event.kind === "insert") {
      void fetch("/api/crm/deals")
        .then(async (response) => (response.ok ? response.json() : Promise.reject(new Error("load"))))
        .then((payload) => {
          const parsed = dealListResponseSchema.safeParse(payload);
          if (parsed.success) setDeals(parsed.data.deals);
        })
        .catch(() => undefined);
      return;
    }
    if (event.kind === "delete") {
      setDeals((current) => current.filter((deal) => deal.id !== event.id));
      return;
    }
    const status = event.status;
    if (!status) return;
    setDeals((current) => current.map((deal) => (deal.id === event.id ? { ...deal, status } : deal)));
  });
  const scroller = useRef<HTMLDivElement>(null);
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? deals.filter((deal) =>
        [customerNames(deal), deal.name ?? "", stageLabel(deal.status), sourceLabel(deal.source)]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
    : deals;

  const { canScrollLeft, canScrollRight } = useBoardScroll(scroller, `${mode}:${visible.length}`);

  function scrollBoard(direction: -1 | 1) {
    scroller.current?.scrollBy({ left: direction * 320, behavior: "smooth" });
  }

  const scrollButtonClass = (visible: boolean) =>
    `absolute top-1/2 z-20 h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-md transition-all hover:text-black hover:shadow-lg ${
      visible ? "flex" : "hidden"
    }`;

  const toggleClass = (active: boolean) =>
    `flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
      active ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
    }`;

  if (loading) return <DealsSkeleton />;

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#f9f9fb]">
      <header className="z-10 border-b border-gray-200/80 bg-white px-6 py-4">
        <div className="flex flex-col gap-3 pt-1 lg:flex-row lg:items-center lg:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <label className="relative min-w-0 flex-1 lg:max-w-lg">
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
              aria-haspopup="dialog"
              aria-expanded={createDeal.open}
              onClick={createDeal.toggle}
              className="hidden cursor-pointer items-center gap-2 rounded-md bg-[#121314] px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-black lg:inline-flex"
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
            className={`left-3 ${scrollButtonClass(canScrollLeft)}`}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={copy.scrollRight}
            onClick={() => scrollBoard(1)}
            className={`right-3 ${scrollButtonClass(canScrollRight)}`}
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <div
            ref={scroller}
            className="flex h-full min-h-0 flex-1 items-stretch gap-3 overflow-x-auto scroll-smooth px-6 pt-6 pb-20 lg:p-6"
          >
            {needle && visible.length === 0 ? (
              <p className="px-2 py-6 text-sm text-gray-500">{copy.emptyDealSearch}</p>
            ) : (
              dealStatusOptions.map((stage) => {
                const cards = visible.filter((deal) => deal.status === stage.id);
                return (
                  <section
                    key={stage.id}
                    aria-label={stage.label}
                    className={`flex h-full max-h-full w-[280px] shrink-0 flex-col rounded-lg border p-3 ${columnClass(stage.tone)}`}
                  >
                    <div
                      className={`mb-3 flex items-center justify-between gap-2 border-b pb-3 ${
                        stage.tone === "won" ? "border-emerald-200" : "border-gray-200"
                      }`}
                    >
                      <DealStatusBadge status={stage.id} />
                      <span className="rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-black">
                        {cards.length}
                      </span>
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
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {visible.length === 0 ? (
            <p className="px-6 py-8 text-sm text-gray-500">{copy.emptyDealSearch}</p>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto lg:hidden">
                {visible.map((deal) => (
                  <DealListMobileRow key={deal.id} deal={deal} />
                ))}
                <div className="h-[calc(4rem+env(safe-area-inset-bottom))]" />
              </div>
              <div className="hidden min-h-0 flex-1 flex-col overflow-y-auto px-6 lg:flex">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="border-b border-gray-200 text-[11px] font-bold tracking-wide text-gray-900 select-none">
                    <tr>
                      <th className="py-3.5 pr-4 pl-6 font-serif font-semibold">{copy.columnDealName}</th>
                      <th className="px-4 py-3.5 font-serif font-semibold">{copy.customers}</th>
                      <th className="px-4 py-3.5 font-serif font-semibold">{copy.source}</th>
                      <th className="px-4 py-3.5 font-serif font-semibold">{copy.columnStage}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visible.map((deal) => {
                      const stage = dealStatusOption(deal.status);
                      const names = customerNames(deal);
                      return (
                        <tr key={deal.id}>
                          <td className="py-3.5 pr-4 pl-6">
                            <div className="font-serif font-semibold text-gray-950">{deal.name || names}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center space-x-2">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-xs font-semibold text-gray-800">
                                {contactInitials(names)}
                              </span>
                              <span className="text-xs font-medium text-gray-900">{names}</span>
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
              </div>
            </>
          )}
        </div>
      )}
      {createDeal.open ? (
        <CreateWalkInDealSheet
          fullName={createDeal.fullName}
          phone={createDeal.phone}
          email={createDeal.email}
          errors={createDeal.errors}
          pending={createDeal.pending}
          onChange={createDeal.change}
          onSubmit={() => void createDeal.submit()}
          onClose={createDeal.close}
        />
      ) : null}
      {createDeal.toast ? (
        <Toast
          key={createDeal.toast.id}
          message={createDeal.toast.message}
          tone={createDeal.toast.tone}
          dismissLabel={copy.dismiss}
          onDismiss={createDeal.dismissToast}
        />
      ) : null}
    </main>
  );
}
