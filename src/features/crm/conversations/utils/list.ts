import type { DealStatus } from "@/src/features/crm/deals/types";
import type { Activity, ConversationListItem } from "@/src/features/crm/conversations/types";
import { mostRelevantDeal } from "@/src/features/crm/conversations/utils/deals";
import { activityPreview, lastMessageAt } from "@/src/features/crm/conversations/utils/formatting";

function listedActivity(row: ConversationListItem["activities"][number]): Activity {
  const duration = row.call?.duration_seconds;
  return {
    position: row.position,
    role: row.role,
    text: row.body,
    channel: row.channel,
    generatedBy: row.generated_by,
    read: row.read_at != null,
    readAt: row.read_at,
    createdAt: row.created_at,
    call: row.call
      ? {
          id: row.call.id,
          direction: row.call.direction,
          durationSeconds: duration ?? undefined,
        }
      : undefined,
  };
}

function latestActivity(item: ConversationListItem): ConversationListItem["activities"][number] | undefined {
  return item.activities.reduce<ConversationListItem["activities"][number] | undefined>((latest, activity) => {
    if (!latest || activity.position > latest.position) return activity;
    return latest;
  }, undefined);
}

export function conversationPreview(item: ConversationListItem): string {
  const latest = latestActivity(item);
  return activityPreview(latest ? listedActivity(latest) : undefined);
}

export function conversationUpdatedAt(item: ConversationListItem): string {
  return lastMessageAt(item.activities.map(listedActivity));
}

export function conversationUnreadCount(item: ConversationListItem): number {
  return item.activities.reduce((count, activity) => count + (activity.read_at == null ? 1 : 0), 0);
}

export function conversationStatus(
  item: ConversationListItem,
  statusByDeal: Record<string, DealStatus> = {},
): DealStatus | undefined {
  const deals = item.customer.deal_customers.map((link) => ({
    status: statusByDeal[link.deal.id] ?? link.deal.status,
  }));
  return mostRelevantDeal(deals)?.status;
}
