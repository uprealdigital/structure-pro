import type { ConversationDealListItem } from "@/src/features/crm/conversations/types";
import { dealAdvancement } from "@/src/features/crm/deals/utils/status";

function byNewest(left: ConversationDealListItem, right: ConversationDealListItem): number {
  return right.createdAt.localeCompare(left.createdAt);
}

export function orderedDealMenu(
  deals: ConversationDealListItem[],
  includeLost: boolean,
): ConversationDealListItem[] {
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
