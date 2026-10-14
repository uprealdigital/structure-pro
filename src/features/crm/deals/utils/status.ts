import { copy } from "@/src/features/crm/deals/locales/en";
import type { DealStatus } from "@/src/features/crm/deals/types";

export type DealStatusOption = {
  id: DealStatus;
  label: string;
  badge: string;
  tone: "default" | "won" | "lost";
};

export const dealStatusOptions: DealStatusOption[] = [
  {
    id: "lead",
    label: copy.statusLead,
    badge: "border-gray-200 bg-gray-100 text-gray-600",
    tone: "default",
  },
  {
    id: "quote_sent",
    label: copy.statusQuoteSent,
    badge: "border-indigo-200 bg-indigo-50 text-indigo-700",
    tone: "default",
  },
  {
    id: "quote_viewed",
    label: copy.statusQuoteViewed,
    badge: "border-violet-200 bg-violet-50 text-violet-700",
    tone: "default",
  },
  {
    id: "partially_signed",
    label: copy.statusPartiallySigned,
    badge: "border-amber-200 bg-amber-50 text-amber-800",
    tone: "default",
  },
  {
    id: "deal_won",
    label: copy.statusDealWon,
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    tone: "won",
  },
  {
    id: "deal_lost",
    label: copy.statusDealLost,
    badge: "border-red-200 bg-red-50 text-red-600",
    tone: "lost",
  },
];

export const defaultIncludedDealStatuses: DealStatus[] = dealStatusOptions
  .map((option) => option.id)
  .filter((id) => id !== "deal_lost");

const advancement: Record<DealStatus, number> = {
  deal_won: 5,
  partially_signed: 4,
  quote_viewed: 3,
  quote_sent: 2,
  lead: 1,
  deal_lost: 0,
};

export function dealStatusOption(status: DealStatus): DealStatusOption | undefined {
  return dealStatusOptions.find((option) => option.id === status);
}

export function dealAdvancement(status: DealStatus): number {
  return advancement[status];
}
