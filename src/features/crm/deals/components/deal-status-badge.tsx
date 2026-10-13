import { dealStatusOption } from "@/src/features/crm/deals/utils/status";
import type { DealStatus } from "@/src/features/crm/deals/types";

export function DealStatusBadge({ status }: { status: DealStatus }) {
  const option = dealStatusOption(status);
  if (!option) return null;

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${option.badge}`}>
      {option.label}
    </span>
  );
}
