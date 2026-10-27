import type { ConversationDealListItem } from "@/src/features/crm/conversations/types";
import { dealStatuses } from "@/src/features/crm/deals/config/status";
import type { DealStatus } from "@/src/features/crm/deals/types";

export function mostRelevantDeal<T extends { status: DealStatus }>(deals: readonly T[]): T | undefined {
  return deals.reduce<T | undefined>((best, deal) => {
    if (!best || dealStatuses[deal.status].priority > dealStatuses[best.status].priority) return deal;
    return best;
  }, undefined);
}

function byPriorityThenNewest(left: ConversationDealListItem, right: ConversationDealListItem): number {
  const priority = dealStatuses[right.stage].priority - dealStatuses[left.stage].priority;
  if (priority !== 0) return priority;
  return right.createdAt.localeCompare(left.createdAt);
}

export function orderedDealMenu(
  deals: ConversationDealListItem[],
  includeLost: boolean,
): ConversationDealListItem[] {
  const visible = includeLost ? deals : deals.filter((deal) => deal.stage !== "deal_lost");
  return [...visible].sort(byPriorityThenNewest);
}
