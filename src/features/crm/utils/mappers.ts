import {
  chatMessageSchema,
  contactSchema,
  conversationSchema,
  dealSchema,
  type ChatMessage,
  type Contact,
  type Conversation,
  type Deal,
} from "@/src/features/crm/types";

export type ContactRow = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  opted_out: boolean;
};

export type DealRow = {
  id: string;
  contact_id: string;
  cpq_quote_id: string;
  source: string;
  status: string;
};

export type ConversationRow = {
  id: string;
  lookup_key: string;
  chat_id: string | null;
  crm_deal_id: string;
  cpq_quote_id: string;
  contract_sent: boolean;
};

export type MessageRow = {
  position: number;
  role: string;
  body: string;
};

export function toContact(row: ContactRow): Contact | undefined {
  const contact = contactSchema.safeParse({
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    optedOut: row.opted_out,
  });
  return contact.success ? contact.data : undefined;
}

export function toDeal(row: DealRow): Deal | undefined {
  const deal = dealSchema.safeParse({
    id: row.id,
    contactId: row.contact_id,
    cpqQuoteId: row.cpq_quote_id,
    source: row.source,
    status: row.status,
  });
  return deal.success ? deal.data : undefined;
}

export function toConversation(
  row: ConversationRow,
  messages: ChatMessage[],
): Conversation | undefined {
  const conversation = conversationSchema.safeParse({
    id: row.id,
    lookupKey: row.lookup_key,
    chatId: row.chat_id ?? undefined,
    crmDealId: row.crm_deal_id,
    cpqQuoteId: row.cpq_quote_id,
    contractSent: row.contract_sent,
    messages,
  });
  return conversation.success ? conversation.data : undefined;
}

export function toMessage(row: MessageRow): ChatMessage | undefined {
  const message = chatMessageSchema.safeParse({ role: row.role, text: row.body });
  return message.success ? message.data : undefined;
}
