import { quoteStatuses } from "@/src/features/crm/quotes/config/status";
import type { QuoteStatus } from "@/src/features/crm/quotes/types";

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const info = quoteStatuses[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${info.badgeClass}`}
    >
      {info.label}
    </span>
  );
}
