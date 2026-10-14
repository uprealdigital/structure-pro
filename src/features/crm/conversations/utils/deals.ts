import type { ConversationDealOption } from "@/src/features/crm/conversations/types";
import { dealAdvancement } from "@/src/features/crm/deals/utils/status";

function byNewest(left: ConversationDealOption, right: ConversationDealOption): number {
  return (right.deal.createdAt ?? "").localeCompare(left.deal.createdAt ?? "");
}

export function orderedDealMenu(
  deals: ConversationDealOption[],
  includeLost: boolean,
): ConversationDealOption[] {
  const active = deals
    .filter((deal) => deal.stage !== "deal_lost")
    .sort(
      (left, right) =>
        dealAdvancement(right.stage) - dealAdvancement(left.stage) || byNewest(left, right),
    );
  if (!includeLost) return active;
  const lost = deals.filter((deal) => deal.stage === "deal_lost").sort(byNewest);
  return [...active, ...lost];
}
