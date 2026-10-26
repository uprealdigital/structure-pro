"use client";

import { ArrowLeftRight, Check, ChevronDown, ChevronRight, EllipsisVertical, Eye, Pencil, Plus, RotateCcw, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { copy } from "@/src/features/crm/conversations/locales/en";
import type { ConversationDealListItem, ConversationDealOption } from "@/src/features/crm/conversations/types";
import { orderedDealMenu } from "@/src/features/crm/conversations/utils/deals";
import { dealStatusOption } from "@/src/features/crm/deals/utils/status";
import { dealNameMaxLength, type DealStatus } from "@/src/features/crm/deals/types";

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
          className="invisible col-start-1 row-start-1 px-0.5 font-serif text-sm tracking-tight whitespace-pre"
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
          className="col-start-1 row-start-1 w-full min-w-0 bg-transparent px-0.5 font-serif text-sm tracking-tight text-gray-950 outline-none"
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

function DealSwitchList({
  deals,
  selectedId,
  showLost,
  lostCount,
  onShowLost,
  onChoose,
}: {
  deals: ConversationDealListItem[];
  selectedId: string;
  showLost: boolean;
  lostCount: number;
  onShowLost: () => void;
  onChoose: (dealId: string) => void;
}) {
  return (
    <>
      <ul role="menu" aria-label={copy.switchActiveDeal} className="max-h-80 space-y-1 overflow-y-auto p-2">
        {deals.map((deal) => {
          const current = deal.id === selectedId;
          const lostDeal = deal.stage === "deal_lost";
          return (
            <li key={deal.id}>
              <button
                type="button"
                role="menuitem"
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
                          className={`truncate text-xs ${
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
                      <span
                        className={`inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${
                          dealStatusOption(deal.stage)?.badge ?? ""
                        }`}
                      >
                        {dealStatusOption(deal.stage)?.label}
                      </span>
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

export function DealHeading({
  title,
  deals,
  selectedId,
  selectedStage,
  lost,
  pending,
  onSelectDeal,
  onRename,
  onMarkLost,
  onReopen,
}: {
  title: string;
  deals: ConversationDealOption[];
  selectedId: string;
  selectedStage: DealStatus;
  lost: boolean;
  pending: boolean;
  onSelectDeal: (dealId: string) => void;
  onRename: (name: string) => Promise<{ success: true } | { error: string }>;
  onMarkLost: () => void;
  onReopen: () => void;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [dealsOpen, setDealsOpen] = useState(false);
  const [showLost, setShowLost] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renamePending, setRenamePending] = useState(false);
  const [renameError, setRenameError] = useState("");
  const menu = useRef<HTMLDivElement>(null);
  const items = menuItems(deals);
  const extra = Math.max(0, items.length - 1);
  const hasNewDeal = items.some((deal) => deal.isNew && deal.id !== selectedId && deal.stage !== "deal_lost");
  const lostCount = items.filter((deal) => deal.stage === "deal_lost").length;
  const visible = orderedDealMenu(items, showLost);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!menu.current?.contains(event.target as Node)) {
        setActionsOpen(false);
        setSwitchOpen(false);
        setDealsOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActionsOpen(false);
        setSwitchOpen(false);
        setDealsOpen(false);
      }
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    setRenaming(false);
    setRenamePending(false);
    setRenameError("");
  }, [selectedId]);

  function toggleActions() {
    setDealsOpen(false);
    setActionsOpen((value) => {
      setSwitchOpen(false);
      return !value;
    });
  }

  function toggleDeals() {
    setActionsOpen(false);
    setSwitchOpen(false);
    setDealsOpen((value) => {
      if (value) return false;
      setShowLost(selectedStage === "deal_lost");
      return true;
    });
  }

  function toggleSwitch() {
    setSwitchOpen((value) => {
      if (value) return false;
      setShowLost(selectedStage === "deal_lost");
      return true;
    });
  }

  function beginRename() {
    setActionsOpen(false);
    setSwitchOpen(false);
    setDealsOpen(false);
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
    setDealsOpen(false);
    if (dealId === selectedId) return;
    onSelectDeal(dealId);
  }

  return (
    <div ref={menu} className="relative z-40 flex items-center gap-1.5">
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
            <span className="font-serif text-sm font-normal tracking-tight whitespace-nowrap text-gray-950">
              {title || copy.quote}
            </span>
            {hasNewDeal ? (
              <span className="ml-1.5 inline-flex animate-pulse items-center rounded-full bg-[#121314] px-1.5 py-0.5 text-[10px] leading-none font-medium text-white [animation-duration:2.8s] motion-reduce:animate-none">
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
          <span className="font-serif text-sm font-normal tracking-tight whitespace-nowrap text-gray-950">
            {title || copy.quote}
          </span>
        )}
        {dealsOpen ? (
          <div className="absolute top-full left-0 z-50 mt-1.5 w-80 max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-2xl">
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
      <div className="relative">
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
        {actionsOpen ? (
          <div
            role="menu"
            className="absolute top-full left-0 z-50 mt-1.5 w-52 rounded-xl border border-gray-200/90 bg-white p-1 shadow-xl"
          >
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
                  <div className="absolute top-full left-0 z-50 mt-1 w-80 max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-2xl md:top-0 md:left-full md:mt-0 md:ml-1.5">
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
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setActionsOpen(false);
                setSwitchOpen(false);
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-black"
            >
              <UserPlus className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden="true" />
              <span>{copy.addPersonToDeal}</span>
            </button>
            <Link
              href="/"
              role="menuitem"
              onClick={() => {
                setActionsOpen(false);
                setSwitchOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-black"
            >
              <Plus className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden="true" />
              <span>{copy.createDeal}</span>
            </Link>
            <div className="my-1 border-t border-gray-100" />
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={() => {
                setActionsOpen(false);
                setSwitchOpen(false);
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
          </div>
        ) : null}
      </div>
    </div>
  );
}
