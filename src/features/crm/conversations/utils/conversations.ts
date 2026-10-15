import type { ConversationSummary } from "@/src/features/crm/conversations/types";

export function canonicalConversationByCustomer(
  conversations: ConversationSummary[],
): Map<string, ConversationSummary> {
  const byCustomer = new Map<string, ConversationSummary>();
  for (const conversation of conversations) {
    const current = byCustomer.get(conversation.customerId);
    const created = conversation.createdAt ?? conversation.updatedAt;
    const currentCreated = current ? (current.createdAt ?? current.updatedAt) : "";
    if (!current || created < currentCreated) byCustomer.set(conversation.customerId, conversation);
  }
  return byCustomer;
}
