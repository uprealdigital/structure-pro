"use client";

import { ArrowUpRight, Copy, Eye, Pencil, RefreshCw, X } from "lucide-react";
import { copy } from "@/src/features/crm/conversations/locales/en";
import { quoteStatuses, type QuoteStatusActionId } from "@/src/features/crm/quotes/config/status";
import type { QuoteStatus } from "@/src/features/crm/quotes/types";

const primaryClass =
  "inline-flex min-w-0 items-center justify-center gap-1.5 rounded-md bg-black px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white shadow-xs transition-colors hover:bg-gray-800 disabled:cursor-default disabled:opacity-60";
const secondaryClass =
  "inline-flex min-w-0 items-center justify-center gap-1 rounded-md border border-gray-200 bg-transparent px-2.5 py-1 text-xs font-medium whitespace-nowrap text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-default disabled:opacity-60";
const cancelClass =
  "inline-flex min-w-0 items-center justify-center gap-1 rounded-md border border-red-500 bg-transparent px-2.5 py-1 text-xs font-medium whitespace-nowrap text-red-600 shadow-xs transition-colors hover:bg-red-50 disabled:cursor-default disabled:opacity-60";
const cardPrimaryClass =
  "flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1b1c1d] disabled:cursor-default disabled:opacity-60";
const cardSecondaryClass =
  "flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#c5c6c9] bg-white px-4 py-3 text-sm font-medium text-[#1a1c1d] shadow-sm transition-colors hover:bg-[#f3f3f5] disabled:cursor-default disabled:opacity-60";
const cardCancelClass =
  "flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-500 bg-white px-4 py-3 text-sm font-medium text-red-600 shadow-sm transition-colors hover:bg-red-50 disabled:cursor-default disabled:opacity-60";
const railPrimaryClass =
  "inline-flex shrink-0 items-center justify-center gap-1 rounded-lg bg-black px-2 py-1.5 text-xs font-medium whitespace-nowrap text-white transition-colors hover:bg-gray-800 disabled:cursor-default disabled:opacity-60";
const railSecondaryClass =
  "inline-flex shrink-0 items-center justify-center gap-1 rounded-lg bg-white px-2 py-1.5 text-xs font-medium whitespace-nowrap text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-default disabled:opacity-60";
const railCancelClass =
  "inline-flex shrink-0 items-center justify-center gap-1 rounded-lg bg-white px-2 py-1.5 text-xs font-medium whitespace-nowrap text-red-600 transition-colors hover:bg-red-50 disabled:cursor-default disabled:opacity-60";

function ActionIcon({
  id,
  canceling,
  card,
  muted,
  rail,
}: {
  id: QuoteStatusActionId;
  canceling: boolean;
  card: boolean;
  muted: boolean;
  rail: boolean;
}) {
  const size = card ? "h-4 w-4" : "h-3.5 w-3.5";
  const mute = muted ? "text-gray-500" : "";
  if (canceling) return <X className={`${size} shrink-0 text-red-500`} aria-hidden="true" />;
  if (id === "edit") return <Pencil className={`${size} shrink-0 ${mute}`} aria-hidden="true" />;
  if (id === "view_requested_changes" || id === "view_signed_quote" || id === "view_deposit_receipt") {
    return <Eye className={`${size} shrink-0 ${mute}`} aria-hidden="true" />;
  }
  if (id === "renew") return <RefreshCw className={`${size} shrink-0`} aria-hidden="true" />;
  if (rail && id === "copy") return <Copy className={`${size} shrink-0 ${mute}`} aria-hidden="true" />;
  if (id === "send" || id === "resend" || id === "collect_deposit") {
    return <ArrowUpRight className={`${size} shrink-0`} aria-hidden="true" />;
  }
  return null;
}

export function QuoteStatusActions({
  status,
  editing,
  disabled,
  size = "compact",
  onAction,
}: {
  status: QuoteStatus;
  editing: boolean;
  disabled?: boolean;
  size?: "compact" | "card" | "rail";
  onAction: (id: QuoteStatusActionId) => void;
}) {
  const card = size === "card";
  const rail = size === "rail";
  const actions = quoteStatuses[status].actions;
  const ordered =
    card || rail
      ? [...actions].sort((left, right) => Number(left.tone === "primary") - Number(right.tone === "primary"))
      : actions;

  return ordered.map((action) => {
    const canceling = editing && action.id === "edit";
    const compactClass = canceling ? cancelClass : action.tone === "primary" ? primaryClass : secondaryClass;
    const cardClass = canceling ? cardCancelClass : action.tone === "primary" ? cardPrimaryClass : cardSecondaryClass;
    const railClass = canceling ? railCancelClass : action.tone === "primary" ? railPrimaryClass : railSecondaryClass;
    const label = canceling
      ? rail
        ? copy.cancelQuoteEditsShort
        : copy.cancelQuoteEdits
      : rail
        ? action.shortLabel
        : action.label;
    return (
      <button
        key={action.id}
        type="button"
        disabled={disabled}
        title={canceling ? copy.cancelQuoteEdits : action.label}
        aria-pressed={action.id === "edit" ? editing : undefined}
        onClick={() => onAction(action.id)}
        className={rail ? railClass : card ? cardClass : compactClass}
      >
        <ActionIcon
          id={action.id}
          canceling={canceling}
          card={card}
          rail={rail}
          muted={!rail || action.tone !== "primary" || canceling}
        />
        <span>{label}</span>
      </button>
    );
  });
}
