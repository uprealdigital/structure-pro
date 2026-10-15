import type { ConversationParticipant } from "@/src/features/crm/conversations/types";

export function orderedDealParticipants(
  participants: ConversationParticipant[],
): ConversationParticipant[] {
  return [...participants].sort((left, right) => {
    if (left.dealId !== right.dealId) return left.dealId.localeCompare(right.dealId);
    if (left.isPrimary !== right.isPrimary) return left.isPrimary ? -1 : 1;
    return left.customer.fullName.localeCompare(right.customer.fullName);
  });
}

export function participantsForDeal(
  participants: ConversationParticipant[],
  dealId: string,
  fallback: ConversationParticipant,
): ConversationParticipant[] {
  const related = participants.filter((participant) => participant.dealId === dealId);
  return related.length > 0 ? related : [fallback];
}
