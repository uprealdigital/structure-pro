import { copy } from "@/src/features/crm/deals/locales/en";
import type { DealStatus } from "@/src/features/crm/deals/types";

export type DealStatusInfo = {
  label: string;
  badgeClass: string;
  tone: "default" | "won" | "lost";
  priority: number;
  canMarkLost: boolean;
};

export const dealStatuses: Record<DealStatus, DealStatusInfo> = {
  new_lead: {
    label: copy.statusNewLead,
    badgeClass: "border-gray-200 bg-gray-100 text-gray-600",
    tone: "default",
    priority: 30,
    canMarkLost: true,
  },
  active_quote: {
    label: copy.statusActiveQuote,
    badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
    tone: "default",
    priority: 40,
    canMarkLost: true,
  },
  pending_deposit: {
    label: copy.statusPendingDeposit,
    badgeClass: "border-violet-200 bg-violet-50 text-violet-700",
    tone: "default",
    priority: 50,
    canMarkLost: true,
  },
  deal_won: {
    label: copy.statusDealWon,
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    tone: "won",
    priority: 20,
    canMarkLost: false,
  },
  deal_lost: {
    label: copy.statusDealLost,
    badgeClass: "border-red-200 bg-red-50 text-red-600",
    tone: "lost",
    priority: 10,
    canMarkLost: false,
  },
};
