"use server";

import { updateContact } from "@/src/features/crm/db/contact";
import { createConversation, deleteConversation, updateConversation } from "@/src/features/crm/db/conversation";
import { updateDeal } from "@/src/features/crm/db/deal";
import { getConversation, getDeal } from "@/src/features/crm/server/queries";
import type { ChatMessage } from "@/src/features/crm/types";

export async function openConversation(input: {
  lookupKey: string;
  chatId?: string;
  crmDealId: string;
  cpqQuoteId: string;
  contractSent: boolean;
  messages: ChatMessage[];
}): Promise<string> {
  return createConversation(input);
}

export async function removeConversation(key: string): Promise<void> {
  await deleteConversation(key);
}

export async function saveAgentSession(
  conversationId: string,
  session: {
    contractSent: boolean;
    messages: ChatMessage[];
    crmDealId: string;
  },
): Promise<void> {
  await updateConversation(conversationId, {
    contractSent: session.contractSent,
    messages: session.messages,
  });
  if (!session.contractSent) return;
  await updateDeal(session.crmDealId, { status: "invoice_sent" });
}

export async function optOutContact(key: string): Promise<void> {
  const conversation = await getConversation(key);
  if (!conversation) return;
  const deal = await getDeal(conversation.crmDealId);
  if (!deal) throw new Error("Deal not found");
  await updateContact(deal.contactId, { optedOut: true });
}
