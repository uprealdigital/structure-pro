"use client";

import { ArrowUpRight, Eye, Pencil, RefreshCw, X } from "lucide-react";
import { copy } from "@/src/features/crm/conversations/locales/en";
import { quoteStatuses, type QuoteStatusActionId } from "@/src/features/crm/quotes/config/status";
import type { QuoteStatus } from "@/src/features/crm/quotes/types";

const primaryClass =
  "inline-flex min-w-0 items-center justify-center gap-1.5 rounded-md bg-black px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white shadow-xs transition-colors hover:bg-gray-800";
const secondaryClass =
  "inline-flex min-w-0 items-center justify-center gap-1 rounded-md border border-gray-200 bg-transparent px-2.5 py-1 text-xs font-medium whitespace-nowrap text-gray-700 transition-colors hover:bg-gray-50";
const cancelClass =
  "inline-flex min-w-0 items-center justify-center gap-1 rounded-md border border-red-500 bg-transparent px-2.5 py-1 text-xs font-medium whitespace-nowrap text-red-600 shadow-xs transition-colors hover:bg-red-50";

function ActionIcon({ id, canceling }: { id: QuoteStatusActionId; canceling: boolean }) {
  if (canceling) return <X className="h-3.5 w-3.5 shrink-0 text-red-500" aria-hidden="true" />;
  if (id === "edit") return <Pencil className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden="true" />;
  if (id === "view_requested_changes" || id === "view_signed_quote" || id === "view_deposit_receipt") {
    return <Eye className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden="true" />;
  }
  if (id === "renew") return <RefreshCw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  if (id === "send" || id === "resend" || id === "collect_deposit") {
    return <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  }
  return null;
}

export function QuoteStatusActions({
  status,
  editing,
  onAction,
}: {
  status: QuoteStatus;
  editing: boolean;
  onAction: (id: QuoteStatusActionId) => void;
}) {
  return quoteStatuses[status].actions.map((action) => {
    const canceling = editing && action.id === "edit";
    return (
      <button
        key={action.id}
        type="button"
        aria-pressed={action.id === "edit" ? editing : undefined}
        onClick={() => onAction(action.id)}
        className={canceling ? cancelClass : action.tone === "primary" ? primaryClass : secondaryClass}
      >
        <ActionIcon id={action.id} canceling={canceling} />
        <span>{canceling ? copy.cancelQuoteEdits : action.label}</span>
      </button>
    );
  });
}
