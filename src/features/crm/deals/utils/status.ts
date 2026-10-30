import { dealStatuses } from "@/src/features/crm/deals/config/status";
import type { DealStatus } from "@/src/features/crm/deals/types";

export type DealStatusOption = {
  id: DealStatus;
  label: string;
  badge: string;
  tone: "default" | "won" | "lost";
};

const pipeline: DealStatus[] = ["new_lead", "active_quote", "pending_deposit", "deal_won", "deal_lost"];

export const dealStatusOptions: DealStatusOption[] = pipeline.map((id) => {
  const status = dealStatuses[id];
  return {
    id,
    label: status.label,
    badge: status.badgeClass,
    tone: status.tone,
  };
});

export const defaultIncludedDealStatuses: DealStatus[] = dealStatusOptions
  .filter((option) => option.tone === "default")
  .map((option) => option.id);

export function canMarkDealLost(status: DealStatus): boolean {
  return dealStatuses[status].canMarkLost;
}

export function dealStatusOption(status: DealStatus): DealStatusOption | undefined {
  return dealStatusOptions.find((option) => option.id === status);
}
