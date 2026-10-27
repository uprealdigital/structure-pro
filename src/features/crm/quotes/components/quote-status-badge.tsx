import { quoteStatuses } from "@/src/features/crm/quotes/config/status";
import type { QuoteStatus } from "@/src/features/crm/quotes/types";

export function QuoteStatusBadge({
  status,
  className = "px-1.5 py-0.5 text-[10px]",
}: {
  status: QuoteStatus;
  className?: string;
}) {
  const info = quoteStatuses[status];
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${info.badgeClass} ${className}`}>
      {info.label}
    </span>
  );
}
