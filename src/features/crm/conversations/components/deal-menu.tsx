"use client";

import { ArrowLeftRight, Ban, Check, ChevronDown, ChevronLeft, ChevronRight, CopyPlus, EllipsisVertical, ExternalLink, Eye, FolderOutput, Info, Link, Pencil, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Customer } from "@/src/features/crm/common/types";
import { copy } from "@/src/features/crm/conversations/locales/en";
import type { ConversationDealListItem, ConversationDealOption, ConversationQuote } from "@/src/features/crm/conversations/types";
import { orderedDealMenu } from "@/src/features/crm/conversations/utils/deals";
import { formatRevisionDate, quoteMenuName, revisionMenuLabel } from "@/src/features/crm/conversations/utils/formatting";
import { peopleMatchingName } from "@/src/features/crm/conversations/utils/people";
import { DealStatusBadge } from "@/src/features/crm/deals/components/deal-status-badge";
import { dealHeadingName } from "@/src/features/crm/deals/utils/naming";
import { canMarkDealLost } from "@/src/features/crm/deals/utils/status";
import { dealNameMaxLength, type DealStatus } from "@/src/features/crm/deals/types";
import type { QuoteStatusAction } from "@/src/features/crm/quotes/config/status";
import { QuoteStatusBadge } from "@/src/features/crm/quotes/components/quote-status-badge";
import { quoteDisplayName } from "@/src/features/crm/quotes/utils/formatting";

function SwitchCustomersIcon({ className = "h-3.5 w-3.5 shrink-0 text-gray-500" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <g transform="translate(15.2 7.2) scale(0.32)" strokeWidth="6">
        <path d="M8 3 4 7l4 4" />
        <path d="M4 7h16" />
        <path d="m16 21 4-4-4-4" />
        <path d="M20 17H4" />
      </g>
    </svg>
  );
}

type QuoteSwitch = {
  quotes: ConversationQuote[];
  viewingQuoteId: string;
  viewingRevisionId: string;
  onSelectRevision: (quoteId: string, revisionId: string) => void;
};

function quoteSwitchName(quote: ConversationQuote, index: number): string {
  return quote.quoteNumber ? quoteDisplayName(quote.quoteNumber, quote.specs) : quoteMenuName(index);
}

function switchableQuotes(quotes: ConversationQuote[], viewingQuoteId: string): ConversationQuote[] {
  return quotes.filter((quote) => quote.status !== "voided" || quote.id === viewingQuoteId);
}

type QuoteActionHandlers = {
  quoteId: string;
  published: boolean;
  pending: boolean;
  adding: boolean;
  canMove: boolean;
  menuAction?: QuoteStatusAction;
  onAddQuote: () => void;
  onMove: () => void;
  onDuplicate: () => void;
  onMenuAction: () => void;
  onCopied: () => void;
  onCopyError: () => void;
};

function SheetRow({
  icon,
  label,
  onClick,
  disabled,
  destructive,
  chevron,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  chevron?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors disabled:opacity-50 ${
        destructive ? "text-[#dc2626] hover:bg-[#fef2f2]" : "text-gray-800 hover:bg-gray-100"
      }`}
    >
      {icon}
      <span className="min-w-0 flex-1 text-[13px] font-medium">{label}</span>
      {chevron ? <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" /> : null}
    </button>
  );
}

function DealHeadingLabel({ name }: { name: string }) {
  return (
    <>
      <span className="lg:hidden">{dealHeadingName(name, "mobile")}</span>
      <span className="hidden lg:inline">{dealHeadingName(name, "desktop")}</span>
    </>
  );
}

function menuItems(deals: ConversationDealOption[]): ConversationDealListItem[] {
  return deals.map((deal) => ({
    id: deal.id,
    title: deal.title,
    priceLabel: deal.priceLabel,
    stage: deal.stage,
    dateLabel: deal.dateLabel,
    createdAt: deal.deal.createdAt ?? "",
    isNew: !deal.deal.viewedAt,
  }));
}

function DealNameEditor({
  initial,
  pending,
  onConfirm,
  onCancel,
}: {
  initial: string;
  pending: boolean;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(() => initial.slice(0, dealNameMaxLength));
  const root = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const cancel = useRef(onCancel);
  cancel.current = onCancel;

  useEffect(() => {
    field.current?.focus();
    field.current?.select();
  }, []);

  useEffect(() => {
    function outside(event: MouseEvent) {
      if (pending) return;
      if (root.current?.contains(event.target as Node)) return;
      cancel.current();
    }
    const timer = window.setTimeout(() => document.addEventListener("mousedown", outside), 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", outside);
    };
  }, [pending]);

  function confirm() {
    if (pending) return;
    const next = value.trim().slice(0, dealNameMaxLength);
    if (!next || next === initial.trim()) {
      onCancel();
      return;
    }
    onConfirm(next);
  }

  return (
    <div
      ref={root}
      className="inline-flex items-center rounded-md border border-gray-300 bg-white py-0.5 pr-0.5 pl-2 shadow-xs"
    >
      <span className="inline-grid min-w-[4ch] items-center">
        <span
          aria-hidden="true"
          className="invisible col-start-1 row-start-1 px-0.5 font-sans text-sm tracking-tight whitespace-pre"
        >
          {value || " "}
        </span>
        <input
          ref={field}
          value={value}
          maxLength={dealNameMaxLength}
          aria-label={copy.renameDeal}
          disabled={pending}
          onChange={(event) => setValue(event.target.value.slice(0, dealNameMaxLength))}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              confirm();
            } else if (event.key === "Escape") {
              event.preventDefault();
              onCancel();
            }
          }}
          className="col-start-1 row-start-1 w-full min-w-0 bg-transparent px-0.5 font-sans text-sm tracking-tight text-gray-950 outline-none"
        />
      </span>
      <span aria-hidden="true" className="ml-1.5 shrink-0 text-[11px] tabular-nums text-gray-400">
        {copy.renameCharacterCount(value.length, dealNameMaxLength)}
      </span>
      <span className="ml-1 inline-flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          aria-label={copy.confirmRename}
          disabled={pending}
          onMouseDown={(event) => event.preventDefault()}
          onClick={confirm}
          className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-[#121314] text-white disabled:opacity-50"
        >
          <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={copy.cancelRename}
          disabled={pending}
          onMouseDown={(event) => event.preventDefault()}
          onClick={onCancel}
          className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-50"
        >
          <X className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
        </button>
      </span>
    </div>
  );
}

function DealPeopleList({
  customers,
  linkedIds,
  primaryId,
  loading,
  error,
  pendingId,
  onToggle,
  expanded = false,
}: {
  customers: Customer[];
  linkedIds: string[];
  primaryId: string;
  loading: boolean;
  error: string;
  pendingId: string;
  onToggle: (customerId: string) => void;
  expanded?: boolean;
}) {
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const linked = new Set(linkedIds);
  const visible = peopleMatchingName(customers, query, linked, primaryId);

  useEffect(() => {
    search.current?.focus();
  }, []);

  return (
    <div className={expanded ? "w-full" : "w-72 max-w-[calc(100vw-2.5rem)]"}>
      <div className="border-b border-gray-200 px-2.5 py-2">
        <label className="relative block">
          <span className="sr-only">{copy.searchCustomers}</span>
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
          </span>
          <input
            ref={search}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.searchCustomers}
            className="w-full rounded-md border border-gray-200 bg-gray-50 py-1.5 pr-3 pl-8 text-xs text-gray-900 transition-colors outline-none placeholder:text-gray-400 focus:border-black focus:ring-1 focus:ring-black"
          />
        </label>
      </div>
      <ul role="menu" aria-label={copy.addPersonToDeal} className={`overflow-y-auto p-1 ${expanded ? "" : "max-h-80"}`}>
        {loading && customers.length === 0 ? (
          <li className="px-2.5 py-2 text-xs text-gray-500">{copy.customersLoading}</li>
        ) : visible.length === 0 ? (
          <li className="px-2.5 py-2 text-xs text-gray-500">{copy.noCustomerMatch}</li>
        ) : (
          visible.map((customer) => {
            const checked = linked.has(customer.id);
            return (
              <li key={customer.id}>
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={checked}
                  disabled={pendingId === customer.id}
                  onClick={() => onToggle(customer.id)}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                    {checked ? (
                      <Check className="h-3.5 w-3.5 text-gray-950" strokeWidth={2.5} aria-hidden="true" />
                    ) : null}
                  </span>
                  <span className="flex min-w-0 flex-1 items-center gap-1.5">
                    <span
                      className={`truncate ${checked ? "font-bold text-gray-950" : "font-medium text-gray-800"}`}
                    >
                      {customer.fullName}
                    </span>
                    {customer.id === primaryId ? (
                      <span className="shrink-0 rounded-full bg-gray-200 px-1.5 py-0.5 text-[9px] leading-none font-semibold text-gray-800">
                        {copy.primary}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
      {error ? <p className="px-3 pt-1 pb-2 text-[11px] text-red-600">{error}</p> : null}
    </div>
  );
}

function DealSwitchList({
  deals,
  selectedId,
  showLost,
  lostCount,
  onShowLost,
  onChoose,
  expanded = false,
}: {
  deals: ConversationDealListItem[];
  selectedId: string;
  showLost: boolean;
  lostCount: number;
  onShowLost: () => void;
  onChoose: (dealId: string) => void;
  expanded?: boolean;
}) {
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const scroller = list.current;
    const item = scroller?.querySelector<HTMLElement>("[data-current='true']");
    if (!scroller || !item) return;
    const view = scroller.getBoundingClientRect();
    const row = item.getBoundingClientRect();
    const hiddenBelow = row.bottom - view.bottom;
    const hiddenAbove = view.top - row.top;
    if (hiddenBelow <= 1 && hiddenAbove <= 1) return;
    if (hiddenBelow > 1) scroller.scrollTop += hiddenBelow;
    else scroller.scrollTop -= hiddenAbove;
  }, []);

  return (
    <>
      <ul ref={list} role="menu" aria-label={copy.switchActiveDeal} className={`space-y-1 overflow-y-auto p-2 ${expanded ? "" : "max-h-80"}`}>
        {deals.map((deal) => {
          const current = deal.id === selectedId;
          const lostDeal = deal.stage === "deal_lost";
          return (
            <li key={deal.id}>
              <button
                type="button"
                role="menuitem"
                data-current={current ? "true" : undefined}
                aria-current={current ? "true" : undefined}
                onClick={() => onChoose(deal.id)}
                className={`w-full rounded-lg p-2.5 text-left transition-colors ${
                  current ? "border border-gray-200/60 bg-gray-50" : "hover:bg-gray-50"
                } ${lostDeal ? "opacity-90" : ""}`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="flex w-3.5 shrink-0 items-center justify-center self-center">
                    {current ? <Eye className="h-3.5 w-3.5 text-black" strokeWidth={2} aria-hidden="true" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span
                          className={`whitespace-nowrap text-xs ${
                            current ? "font-bold text-gray-950" : "font-medium text-gray-800"
                          }`}
                        >
                          {deal.title || copy.quote}
                        </span>
                        {deal.isNew && !current ? (
                          <span className="shrink-0 rounded-full bg-[#121314] px-1.5 py-0.5 text-[10px] leading-none font-medium text-white">
                            {copy.newDeal}
                          </span>
                        ) : null}
                      </span>
                      <DealStatusBadge status={deal.stage} />
                    </span>
                    <span className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-gray-500">
                      <span className="font-semibold text-gray-900">{deal.priceLabel}</span>
                      <span>{deal.dateLabel}</span>
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {lostCount > 0 ? (
        <div className="border-t border-gray-100 px-3 py-2">
          <button
            type="button"
            role="switch"
            aria-checked={showLost}
            onClick={onShowLost}
            className="inline-flex cursor-pointer items-center gap-1.5 py-1 text-[11px] font-medium text-gray-600"
          >
            <span className="font-medium text-gray-700">{copy.lostDeals}</span>
            <span className="inline-flex items-center justify-center rounded-full bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] leading-none font-medium text-gray-500">
              {lostCount}
            </span>
            <span
              className={`relative h-4 w-7 rounded-full p-0.5 transition-colors ${
                showLost ? "bg-gray-900" : "bg-gray-200"
              }`}
            >
              <span
                className={`block h-3 w-3 rounded-full bg-white shadow-xs transition-transform ${
                  showLost ? "translate-x-3" : ""
                }`}
              />
            </span>
          </button>
        </div>
      ) : null}
    </>
  );
}

function QuoteSwitchList({
  quotes,
  viewingQuoteId,
  onChoose,
}: {
  quotes: ConversationQuote[];
  viewingQuoteId: string;
  onChoose: (quoteId: string) => void;
}) {
  return (
    <ul role="menu" aria-label={copy.switchQuote} className="space-y-1 overflow-y-auto p-2">
      {quotes.map((quote, index) => {
        const current = quote.id === viewingQuoteId;
        return (
          <li key={quote.id}>
            <button
              type="button"
              role="menuitem"
              aria-current={current ? "true" : undefined}
              onClick={() => onChoose(quote.id)}
              className={`flex w-full items-center gap-1.5 rounded-lg p-2.5 text-left transition-colors ${
                current ? "border border-gray-200/60 bg-gray-50" : "hover:bg-gray-50"
              }`}
            >
              <span className="flex w-3.5 shrink-0 items-center justify-center">
                {current ? <Eye className="h-3.5 w-3.5 text-black" strokeWidth={2} aria-hidden="true" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className={`truncate text-xs ${current ? "font-bold text-gray-950" : "font-medium text-gray-800"}`}>
                    {quoteSwitchName(quote, index)}
                  </span>
                  <QuoteStatusBadge status={quote.status} />
                </span>
                <span className="mt-1.5 block text-[11px] font-semibold text-gray-900">{quote.totalLabel}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function RevisionSwitchList({
  quote,
  currentRevisionId,
  onChoose,
}: {
  quote: ConversationQuote | undefined;
  currentRevisionId: string;
  onChoose: (revisionId: string) => void;
}) {
  if (!quote) return null;
  const revisions = [...quote.revisions].sort((left, right) => right.revisionNumber - left.revisionNumber);
  return (
    <ul role="menu" aria-label={copy.revisionsMenu} className="space-y-1 overflow-y-auto p-2">
      {revisions.map((revision) => {
        const current = revision.id === currentRevisionId;
        const dated = revision.createdAt || revision.updatedAt;
        return (
          <li key={revision.id}>
            <button
              type="button"
              role="menuitem"
              aria-current={current ? "true" : undefined}
              onClick={() => onChoose(revision.id)}
              className={`w-full rounded-lg p-2.5 text-left transition-colors ${
                current ? "border border-gray-200/60 bg-gray-50" : "hover:bg-gray-50"
              }`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="flex w-3.5 shrink-0 items-center justify-center">
                    {current ? <Eye className="h-3.5 w-3.5 text-black" strokeWidth={2} aria-hidden="true" /> : null}
                  </span>
                  <span className={`truncate text-xs ${current ? "font-bold text-gray-950" : "font-medium text-gray-800"}`}>
                    {revisionMenuLabel(revision.revisionNumber)}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-gray-900">{revision.totalLabel}</span>
              </span>
              <span className="mt-1.5 flex items-center justify-between gap-3 pl-5 text-[11px] text-gray-500">
                <span className="truncate">{revision.summary}</span>
                <span className="shrink-0">{formatRevisionDate(dated)}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function DealHeading({
  title,
  deals,
  selectedId,
  selectedStage,
  lost,
  pending,
  onSelectDeal,
  onRename,
  onCreateDeal,
  creating,
  customers,
  customersLoading,
  customersError,
  linkedCustomerIds,
  primaryCustomerId,
  pendingCustomerId,
  onLoadCustomers,
  onToggleCustomer,
  onMarkLost,
  onReopen,
  mobileActionsSlot,
  quoteActions,
  quoteSwitch,
  details,
  onViewDetails,
}: {
  title: string;
  deals: ConversationDealOption[];
  selectedId: string;
  selectedStage: DealStatus;
  lost: boolean;
  pending: boolean;
  creating: boolean;
  customers: Customer[];
  customersLoading: boolean;
  customersError: string;
  linkedCustomerIds: string[];
  primaryCustomerId: string;
  pendingCustomerId: string;
  onSelectDeal: (dealId: string) => void;
  onRename: (name: string) => Promise<{ success: true } | { error: string }>;
  onCreateDeal: () => void;
  onLoadCustomers: () => void;
  onToggleCustomer: (customerId: string) => void;
  onMarkLost: () => void;
  onReopen: () => void;
  mobileActionsSlot: HTMLElement | null;
  quoteActions?: QuoteActionHandlers;
  quoteSwitch?: QuoteSwitch;
  details: ReactNode;
  onViewDetails: () => void;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetStep, setSheetStep] = useState<"actions" | "deals" | "people" | "details" | "quotes" | "revisions">("actions");
  const [subStep, setSubStep] = useState<"deals" | "people" | "details" | "quotes" | "revisions">("deals");
  const [revisionQuoteId, setRevisionQuoteId] = useState<string | null>(null);
  const [revisionBackToQuotes, setRevisionBackToQuotes] = useState(false);
  const [holdCut, setHoldCut] = useState(false);
  const [sheetHeight, setSheetHeight] = useState<number | null>(null);
  const actionsPane = useRef<HTMLDivElement>(null);
  const subPane = useRef<HTMLDivElement>(null);
  const revisionPane = useRef<HTMLDivElement>(null);
  const sheetTitleId = useId();
  const [switchOpen, setSwitchOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [peopleDealId, setPeopleDealId] = useState(selectedId);
  const [dealsOpen, setDealsOpen] = useState(false);
  if (peopleDealId !== selectedId) {
    setPeopleDealId(selectedId);
    setPeopleOpen(false);
  }
  const [showLost, setShowLost] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renamePending, setRenamePending] = useState(false);
  const [renameError, setRenameError] = useState("");
  const menu = useRef<HTMLDivElement>(null);
  const items = menuItems(deals);
  const canMarkLost = canMarkDealLost(selectedStage);
  const extra = Math.max(0, items.length - 1);
  const hasNewDeal = items.some((deal) => deal.isNew && deal.id !== selectedId && deal.stage !== "deal_lost");
  const lostCount = items.filter((deal) => deal.stage === "deal_lost").length;
  const visible = orderedDealMenu(items, showLost);

  useEffect(() => {
    function close(event: MouseEvent) {
      const target = event.target as Node;
      if (menu.current?.contains(target) || mobileActionsSlot?.contains(target)) return;
      setActionsOpen(false);
      setSwitchOpen(false);
      setPeopleOpen(false);
      setDealsOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (sheetOpen) {
        if (sheetStep === "actions" || sheetStep === "details") {
          setSheetOpen(false);
          setSheetStep("actions");
          setSheetHeight(null);
        } else if (sheetStep === "revisions" && revisionBackToQuotes) {
          setSubStep("quotes");
          setSheetStep("quotes");
        } else setSheetStep("actions");
        return;
      }
      setActionsOpen(false);
      setSwitchOpen(false);
      setPeopleOpen(false);
      setDealsOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileActionsSlot, revisionBackToQuotes, sheetOpen, sheetStep]);

  useEffect(() => {
    setRenaming(false);
    setRenamePending(false);
    setRenameError("");
    setSheetOpen(false);
    setSheetStep("actions");
    setSheetHeight(null);
  }, [selectedId]);

  function toggleActions() {
    setDealsOpen(false);
    setActionsOpen((value) => {
      setSwitchOpen(false);
      setPeopleOpen(false);
      return !value;
    });
  }

  function toggleDeals() {
    setActionsOpen(false);
    setSwitchOpen(false);
    setPeopleOpen(false);
    setDealsOpen((value) => {
      if (value) return false;
      setShowLost(selectedStage === "deal_lost");
      return true;
    });
  }

  function toggleSwitch() {
    setPeopleOpen(false);
    setSwitchOpen((value) => {
      if (value) return false;
      setShowLost(selectedStage === "deal_lost");
      return true;
    });
  }

  function togglePeople() {
    setSwitchOpen(false);
    setPeopleOpen((value) => {
      if (value) return false;
      onLoadCustomers();
      return true;
    });
  }

  function closeSheet() {
    setSheetOpen(false);
    setSheetStep("actions");
    setSheetHeight(null);
  }

  function openSheetStep(step: "deals" | "people" | "details" | "quotes" | "revisions") {
    setSubStep(step);
    setSheetStep(step);
  }

  function goBack() {
    if (sheetStep === "revisions" && revisionBackToQuotes) {
      setSubStep("quotes");
      setSheetStep("quotes");
      return;
    }
    setSheetStep("actions");
  }

  function openSwitchQuote() {
    if (!quoteSwitch) return;
    const quotes = switchableQuotes(quoteSwitch.quotes, quoteSwitch.viewingQuoteId);
    if (quotes.length > 1) {
      setRevisionBackToQuotes(true);
      openSheetStep("quotes");
      return;
    }
    const quote = quotes[0] ?? quoteSwitch.quotes[0];
    if (!quote) return;
    setRevisionQuoteId(quote.id);
    setRevisionBackToQuotes(false);
    setSheetStep("revisions");
  }

  const cutSheet = sheetStep === "deals" || sheetStep === "quotes" || sheetStep === "revisions" || holdCut;

  useEffect(() => {
    const cut = sheetStep === "deals" || sheetStep === "quotes" || sheetStep === "revisions";
    setHoldCut((current) => (current === cut ? current : cut));
  }, [sheetStep]);

  useLayoutEffect(() => {
    if (!sheetOpen) return;
    const pane =
      sheetStep === "actions" ? actionsPane.current : sheetStep === "revisions" ? revisionPane.current : subPane.current;
    if (!pane) return;
    const measure = () => {
      const next = pane.offsetHeight;
      setSheetHeight((current) => (current === next ? current : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(pane);
    return () => observer.disconnect();
  }, [sheetOpen, sheetStep, subStep]);

  function beginRename() {
    setActionsOpen(false);
    setSwitchOpen(false);
    setPeopleOpen(false);
    setDealsOpen(false);
    closeSheet();
    setRenameError("");
    setRenaming(true);
  }

  function cancelRename() {
    if (renamePending) return;
    setRenameError("");
    setRenaming(false);
  }

  async function commitRename(name: string) {
    setRenamePending(true);
    setRenameError("");
    const result = await onRename(name);
    setRenamePending(false);
    if ("error" in result) {
      setRenameError(copy.renameDealError);
      return;
    }
    setRenaming(false);
  }

  function choose(dealId: string) {
    setActionsOpen(false);
    setSwitchOpen(false);
    setPeopleOpen(false);
    setDealsOpen(false);
    closeSheet();
    if (dealId === selectedId) return;
    onSelectDeal(dealId);
  }

  function runQuoteAction(action: () => void) {
    closeSheet();
    action();
  }

  async function copyQuoteLink() {
    if (!quoteActions) return;
    closeSheet();
    const url = `${window.location.origin}/quote/${quoteActions.quoteId}`;
    try {
      await navigator.clipboard.writeText(url);
      quoteActions.onCopied();
    } catch {
      quoteActions.onCopyError();
    }
  }

  function actionsMenu(align: "start" | "end") {
    const menuClass =
      align === "end"
        ? "absolute top-full right-0 z-50 mt-1.5 w-52 rounded-xl border border-gray-200/90 bg-white p-1 shadow-xl"
        : "absolute top-full left-0 z-50 mt-1.5 w-52 rounded-xl border border-gray-200/90 bg-white p-1 shadow-xl";
    const switchClass =
      align === "end"
        ? "absolute top-full right-0 z-50 mt-1 w-max min-w-80 max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-2xl"
        : "absolute top-full left-0 z-50 mt-1 w-max min-w-80 max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-2xl md:top-0 md:left-full md:mt-0 md:ml-1.5";
    const peopleClass =
      align === "end"
        ? "absolute top-full right-0 z-50 mt-1 overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-2xl"
        : "absolute top-full left-0 z-50 mt-1 overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-2xl md:top-0 md:left-full md:mt-0 md:ml-1.5";
    return (
      <div role="menu" className={menuClass}>
        {items.length > 1 ? (
          <div className="relative">
            <button
              type="button"
              role="menuitem"
              aria-expanded={switchOpen}
              aria-haspopup="menu"
              onClick={toggleSwitch}
              className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                switchOpen ? "bg-gray-100 text-black" : "text-gray-800 hover:bg-gray-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 text-gray-700" aria-hidden="true" />
                <span>{copy.switchActiveDeal}</span>
              </span>
              <ChevronRight className="h-3 w-3 shrink-0 text-gray-500" aria-hidden="true" />
            </button>
            {switchOpen ? (
              <div className={switchClass}>
                <DealSwitchList
                  deals={visible}
                  selectedId={selectedId}
                  showLost={showLost}
                  lostCount={lostCount}
                  onShowLost={() => setShowLost((value) => !value)}
                  onChoose={choose}
                />
              </div>
            ) : null}
          </div>
        ) : null}
        <button
          type="button"
          role="menuitem"
          onClick={beginRename}
          className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-black"
        >
          <Pencil className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden="true" />
          <span>{copy.renameDeal}</span>
        </button>
        <div className="relative">
          <button
            type="button"
            role="menuitem"
            aria-expanded={peopleOpen}
            aria-haspopup="menu"
            onClick={togglePeople}
            className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
              peopleOpen ? "bg-gray-100 text-black" : "text-gray-700 hover:bg-gray-50 hover:text-black"
            }`}
          >
            <span className="flex items-center gap-2">
              <SwitchCustomersIcon />
              <span>{copy.addPersonToDeal}</span>
            </span>
            <ChevronRight className="h-3 w-3 shrink-0 text-gray-500" aria-hidden="true" />
          </button>
          {peopleOpen ? (
            <div className={peopleClass}>
              <DealPeopleList
                customers={customers}
                linkedIds={linkedCustomerIds}
                primaryId={primaryCustomerId}
                loading={customersLoading}
                error={customersError}
                pendingId={pendingCustomerId}
                onToggle={onToggleCustomer}
              />
            </div>
          ) : null}
        </div>
        <button
          type="button"
          role="menuitem"
          disabled={creating}
          onClick={() => {
            setActionsOpen(false);
            setSwitchOpen(false);
            setPeopleOpen(false);
            onCreateDeal();
          }}
          className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-black disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden="true" />
          <span>{copy.createDeal}</span>
        </button>
        {canMarkLost || lost ? (
          <>
            <div className="my-1 border-t border-gray-100" />
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={() => {
                setActionsOpen(false);
                setSwitchOpen(false);
                setPeopleOpen(false);
                if (lost) onReopen();
                else onMarkLost();
              }}
              className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium disabled:opacity-50 ${
                lost ? "text-gray-700 hover:bg-gray-50" : "text-red-600 hover:bg-red-50"
              }`}
            >
              {lost ? (
                <RotateCcw className="h-3.5 w-3.5 shrink-0 text-gray-600" aria-hidden="true" />
              ) : (
                <X className="h-3.5 w-3.5 shrink-0 text-red-600" aria-hidden="true" />
              )}
              <span>{lost ? copy.reopenDeal : copy.markAsLost}</span>
            </button>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div ref={menu} className={`relative z-40 items-center gap-1.5 ${renaming ? "flex" : "hidden lg:flex"}`}>
      <div className="relative flex items-center">
        {renaming ? (
          <div className="relative">
            <DealNameEditor
              initial={title || copy.quote}
              pending={renamePending}
              onConfirm={(name) => void commitRename(name)}
              onCancel={cancelRename}
            />
            {renameError ? (
              <p className="absolute top-full left-0 mt-1 whitespace-nowrap text-[11px] text-red-600">{renameError}</p>
            ) : null}
          </div>
        ) : extra > 0 ? (
          <button
            type="button"
            title={copy.viewOtherDeals}
            aria-haspopup="menu"
            aria-expanded={dealsOpen}
            onClick={toggleDeals}
            className="group -ml-1.5 inline-flex cursor-pointer items-center rounded-md py-0.5 pr-1 pl-1.5 text-left transition-colors hover:bg-gray-50"
          >
            <span className="font-sans text-sm font-normal tracking-tight whitespace-nowrap text-gray-950">
              <DealHeadingLabel name={title || copy.quote} />
            </span>
            {hasNewDeal ? (
              <span className="ml-1.5 inline-flex items-center rounded-full bg-[#121314] px-1.5 py-0.5 text-[10px] leading-none font-medium text-white">
                {copy.newDeal}
              </span>
            ) : null}
            <span className="ml-1.5 inline-flex items-center rounded-full bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-700 shadow-xs">
              <span className="text-[11px] leading-none">+{extra}</span>
            </span>
            <ChevronDown
              className={`h-3.5 shrink-0 text-gray-500 transition-all duration-200 ${
                dealsOpen
                  ? "ml-1 w-3.5 rotate-180 opacity-100"
                  : "ml-0 w-0 opacity-0 group-hover:ml-1 group-hover:w-3.5 group-hover:opacity-100"
              }`}
              aria-hidden="true"
            />
          </button>
        ) : (
          <span className="font-sans text-sm font-normal tracking-tight whitespace-nowrap text-gray-950">
            <DealHeadingLabel name={title || copy.quote} />
          </span>
        )}
        {dealsOpen ? (
          <div className="absolute top-full left-0 z-50 mt-1.5 w-max min-w-80 max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-2xl">
            <DealSwitchList
              deals={visible}
              selectedId={selectedId}
              showLost={showLost}
              lostCount={lostCount}
              onShowLost={() => setShowLost((value) => !value)}
              onChoose={choose}
            />
          </div>
        ) : null}
      </div>
      <div className="relative hidden lg:block">
        <button
          type="button"
          aria-expanded={actionsOpen}
          aria-haspopup="menu"
          aria-label={copy.moreDealActions}
          onClick={toggleActions}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-transparent text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          <EllipsisVertical className="h-4 w-4" aria-hidden="true" />
        </button>
        {actionsOpen ? actionsMenu("start") : null}
      </div>
      {mobileActionsSlot
        ? createPortal(
            <>
              <button
                type="button"
                aria-expanded={sheetOpen && sheetStep === "details"}
                aria-haspopup="dialog"
                aria-label={copy.viewDetails}
                onClick={() => {
                  onViewDetails();
                  setSheetHeight(null);
                  openSheetStep("details");
                  setSheetOpen(true);
                }}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-[#edeef0] text-gray-600 transition-colors hover:bg-[#e4e5e7] hover:text-gray-900"
              >
                <Info className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-expanded={sheetOpen && sheetStep === "actions"}
                aria-haspopup="dialog"
                aria-label={copy.conversationActions}
                onClick={() => {
                  setSubStep("deals");
                  setSheetStep("actions");
                  setSheetHeight(null);
                  setSheetOpen(true);
                }}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-[#edeef0] text-gray-600 transition-colors hover:bg-[#e4e5e7] hover:text-gray-900"
              >
                <EllipsisVertical className="h-4 w-4" aria-hidden="true" />
              </button>
            </>,
            mobileActionsSlot,
          )
        : null}
      {sheetOpen
        ? createPortal(
            <div className="fixed inset-0 z-50 lg:hidden">
              <button type="button" aria-label={copy.close} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeSheet} />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={sheetTitleId}
                className="absolute inset-x-0 bottom-0 flex max-h-full flex-col overflow-hidden rounded-t-2xl border-t border-gray-200 bg-white text-gray-900"
              >
                <div
                  className={`relative overflow-hidden ${
                    subStep === "details" || sheetHeight == null || cutSheet
                      ? ""
                      : "transition-[height] duration-300 ease-out motion-reduce:transition-none"
                  }`}
                  style={sheetHeight == null ? undefined : { height: sheetHeight }}
                >
                  <div
                    ref={actionsPane}
                    className={`max-h-[100dvh] overflow-y-auto pb-[45px] ${
                      subStep === "details" || cutSheet ? "" : "transition-transform duration-300 ease-out motion-reduce:transition-none"
                    } ${sheetStep === "actions" ? "translate-x-0" : "-translate-x-full"}`}
                  >
                    <div className="border-b border-gray-200 px-3 py-3">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <h2 id={sheetStep === "actions" ? sheetTitleId : undefined} className="truncate font-sans text-sm font-semibold text-gray-900">
                            {title || copy.quote}
                          </h2>
                          <div className="mt-1.5">
                            <DealStatusBadge status={selectedStage} />
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label={copy.close}
                          onClick={closeSheet}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 px-3 py-3">
                      <section className="flex flex-col gap-1">
                        <h3 className="px-2 text-[11px] font-semibold text-gray-500">{copy.dealsSection}</h3>
                        {items.length > 1 ? (
                          <SheetRow
                            icon={<ArrowLeftRight className="h-[18px] w-[18px] shrink-0 text-gray-500" aria-hidden="true" />}
                            label={copy.switchActiveDeal}
                            chevron
                            onClick={() => {
                              setShowLost(selectedStage === "deal_lost");
                              openSheetStep("deals");
                            }}
                          />
                        ) : null}
                        <SheetRow
                          icon={<Pencil className="h-[18px] w-[18px] shrink-0 text-gray-500" aria-hidden="true" />}
                          label={copy.renameDeal}
                          onClick={beginRename}
                        />
                        <SheetRow
                          icon={<SwitchCustomersIcon className="h-[18px] w-[18px] shrink-0 text-gray-500" />}
                          label={copy.addPersonToDeal}
                          chevron
                          onClick={() => {
                            onLoadCustomers();
                            openSheetStep("people");
                          }}
                        />
                        <SheetRow
                          icon={<Plus className="h-[18px] w-[18px] shrink-0 text-gray-500" strokeWidth={2} aria-hidden="true" />}
                          label={copy.createDeal}
                          disabled={creating}
                          onClick={() => {
                            closeSheet();
                            onCreateDeal();
                          }}
                        />
                        {canMarkLost || lost ? (
                          <SheetRow
                            icon={
                              lost ? (
                                <RotateCcw className="h-[18px] w-[18px] shrink-0 text-gray-500" aria-hidden="true" />
                              ) : (
                                <X className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                              )
                            }
                            label={lost ? copy.reopenDeal : copy.markAsLost}
                            destructive={!lost}
                            disabled={pending}
                            onClick={() => {
                              closeSheet();
                              if (lost) onReopen();
                              else onMarkLost();
                            }}
                          />
                        ) : null}
                      </section>
                      {quoteActions ? (
                        <section className="flex flex-col gap-1 border-t border-gray-200 pt-3">
                          <h3 className="px-2 text-[11px] font-semibold text-gray-500">{copy.quotesMenu}</h3>
                          {quoteSwitch ? (
                            <SheetRow
                              icon={<ArrowLeftRight className="h-[18px] w-[18px] shrink-0 text-gray-500" aria-hidden="true" />}
                              label={copy.switchQuote}
                              chevron
                              onClick={openSwitchQuote}
                            />
                          ) : null}
                          <SheetRow
                            icon={<ExternalLink className="h-[18px] w-[18px] shrink-0 text-gray-500" aria-hidden="true" />}
                            label={copy.openQuote}
                            onClick={() => {
                              const quoteId = quoteActions.quoteId;
                              closeSheet();
                              window.open(`/quote/${quoteId}?mode=internal`, "_blank", "noopener,noreferrer");
                            }}
                          />
                          {quoteActions.published ? (
                            <SheetRow
                              icon={<Link className="h-[18px] w-[18px] shrink-0 text-gray-500" aria-hidden="true" />}
                              label={copy.copyPublishLink}
                              onClick={() => void copyQuoteLink()}
                            />
                          ) : null}
                          <SheetRow
                            icon={<Plus className="h-[18px] w-[18px] shrink-0 text-gray-500" strokeWidth={2} aria-hidden="true" />}
                            label={quoteActions.adding ? copy.addingQuote : copy.addQuote}
                            disabled={quoteActions.adding || quoteActions.pending}
                            onClick={() => runQuoteAction(quoteActions.onAddQuote)}
                          />
                          <SheetRow
                            icon={<CopyPlus className="h-[18px] w-[18px] shrink-0 text-gray-500" aria-hidden="true" />}
                            label={copy.duplicateQuote}
                            disabled={quoteActions.pending}
                            onClick={() => runQuoteAction(quoteActions.onDuplicate)}
                          />
                          {quoteActions.canMove ? (
                            <SheetRow
                              icon={<FolderOutput className="h-[18px] w-[18px] shrink-0 text-gray-500" aria-hidden="true" />}
                              label={copy.moveQuoteToNewDeal}
                              disabled={quoteActions.pending}
                              onClick={() => runQuoteAction(quoteActions.onMove)}
                            />
                          ) : null}
                          {quoteActions.menuAction ? (
                            <SheetRow
                              icon={
                                quoteActions.menuAction.id === "delete_draft" ? (
                                  <Trash2 className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                                ) : (
                                  <Ban className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                                )
                              }
                              label={quoteActions.menuAction.label}
                              destructive
                              disabled={quoteActions.pending}
                              onClick={() => runQuoteAction(quoteActions.onMenuAction)}
                            />
                          ) : null}
                        </section>
                      ) : null}
                    </div>
                  </div>
                  <div
                    ref={subPane}
                    className={`absolute inset-x-0 top-0 flex max-h-[100dvh] min-h-0 flex-col pb-[45px] ${
                      subStep === "details" || cutSheet ? "" : "transition-transform duration-300 ease-out motion-reduce:transition-none"
                    } ${
                      sheetStep === "actions" || (sheetStep === "revisions" && !revisionBackToQuotes)
                        ? "translate-x-full"
                        : "translate-x-0"
                    }`}
                  >
                    <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 px-3 py-3">
                      {subStep === "details" ? (
                        <div className="flex w-full items-center gap-2">
                          <h2 id={sheetTitleId} className="min-w-0 flex-1 truncate font-serif text-sm font-semibold text-gray-900">
                            {copy.details}
                          </h2>
                          <button
                            type="button"
                            aria-label={copy.close}
                            onClick={closeSheet}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900"
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            aria-label={copy.goBack}
                            onClick={goBack}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-900 transition-colors hover:bg-gray-100"
                          >
                            <ChevronLeft className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                          </button>
                          <h2
                            id={
                              sheetStep === "deals" || sheetStep === "people" || sheetStep === "quotes"
                                ? sheetTitleId
                                : undefined
                            }
                            className="min-w-0 flex-1 truncate font-serif text-base font-semibold text-gray-900"
                          >
                            {subStep === "deals"
                              ? copy.switchActiveDeal
                              : subStep === "quotes"
                                ? copy.switchQuote
                                : subStep === "revisions"
                                  ? copy.revisionsMenu
                                  : copy.addPersonToDeal}
                          </h2>
                        </>
                      )}
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto">
                      {subStep === "deals" ? (
                        <DealSwitchList
                          deals={visible}
                          selectedId={selectedId}
                          showLost={showLost}
                          lostCount={lostCount}
                          expanded
                          onShowLost={() => setShowLost((value) => !value)}
                          onChoose={choose}
                        />
                      ) : subStep === "people" ? (
                        <DealPeopleList
                          customers={customers}
                          linkedIds={linkedCustomerIds}
                          primaryId={primaryCustomerId}
                          loading={customersLoading}
                          error={customersError}
                          pendingId={pendingCustomerId}
                          expanded
                          onToggle={onToggleCustomer}
                        />
                      ) : subStep === "quotes" && quoteSwitch ? (
                        <QuoteSwitchList
                          quotes={switchableQuotes(quoteSwitch.quotes, quoteSwitch.viewingQuoteId)}
                          viewingQuoteId={quoteSwitch.viewingQuoteId}
                          onChoose={(quoteId) => {
                            setRevisionQuoteId(quoteId);
                            setRevisionBackToQuotes(true);
                            setSheetStep("revisions");
                          }}
                        />
                      ) : (
                        details
                      )}
                    </div>
                  </div>
                  {quoteSwitch ? (
                    <div
                      ref={revisionPane}
                      className={`absolute inset-x-0 top-0 flex max-h-[100dvh] min-h-0 flex-col bg-white pb-[45px] ${
                        cutSheet ? "" : "transition-transform duration-300 ease-out motion-reduce:transition-none"
                      } ${sheetStep === "revisions" ? "translate-x-0" : "translate-x-full"}`}
                    >
                      <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 px-3 py-3">
                        <button
                          type="button"
                          aria-label={copy.goBack}
                          onClick={goBack}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-900 transition-colors hover:bg-gray-100"
                        >
                          <ChevronLeft className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                        </button>
                        <h2
                          id={sheetStep === "revisions" ? sheetTitleId : undefined}
                          className="min-w-0 flex-1 truncate font-serif text-base font-semibold text-gray-900"
                        >
                          {copy.revisionsMenu}
                        </h2>
                      </div>
                      <div className="min-h-0 flex-1 overflow-y-auto">
                        <RevisionSwitchList
                          quote={
                            quoteSwitch.quotes.find((quote) => quote.id === revisionQuoteId) ??
                            quoteSwitch.quotes.find((quote) => quote.id === quoteSwitch.viewingQuoteId) ??
                            quoteSwitch.quotes[0]
                          }
                          currentRevisionId={
                            (revisionQuoteId ?? quoteSwitch.viewingQuoteId) === quoteSwitch.viewingQuoteId
                              ? quoteSwitch.viewingRevisionId
                              : ""
                          }
                          onChoose={(revisionId) => {
                            const quoteId = revisionQuoteId ?? quoteSwitch.viewingQuoteId;
                            closeSheet();
                            quoteSwitch.onSelectRevision(quoteId, revisionId);
                          }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
