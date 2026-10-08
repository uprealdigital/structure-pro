import "server-only";

import { readContact } from "@/src/features/crm/db/contact";
import { readConversation } from "@/src/features/crm/db/conversation";
import { readDeal } from "@/src/features/crm/db/deal";
import { getQuoteForPage } from "@/src/features/cpq/server/queries";

export async function getContact(id: string) {
  return readContact(id);
}

export async function getDeal(id: string) {
  return readDeal(id);
}

export async function getConversation(key: string) {
  return readConversation(key);
}

export async function getAgentSession(key: string) {
  const conversation = await getConversation(key);
  if (!conversation) return undefined;

  const deal = await getDeal(conversation.crmDealId);
  if (!deal) throw new Error("Deal not found");
  const contact = await getContact(deal.contactId);
  if (!contact) throw new Error("Contact not found");
  if (contact.optedOut) return undefined;

  const quote = await getQuoteForPage(conversation.cpqQuoteId);
  if (!quote) throw new Error("Quote not found");

  return {
    conversationId: conversation.id,
    session: {
      fullName: contact.fullName,
      phone: contact.phone,
      email: contact.email,
      chatId: conversation.chatId,
      invoiceId: quote.invoiceId,
      cpqQuoteId: conversation.cpqQuoteId,
      crmDealId: conversation.crmDealId,
      crmContactId: contact.id,
      specLines: quote.summary.specs.map((spec) => `- ${spec.label}: ${spec.value}`).join("\n"),
      total: quote.summary.total,
      brandName: quote.summary.brand.name,
      messages: conversation.messages,
      contractSent: conversation.contractSent,
    },
  };
}
