import { callRouter, readJson } from "@/src/common/utils/internal-call";
import type { AgentSession, ChatMessage } from "@/src/features/ai/types";

type ConversationPayload = {
  id: string;
  lookupKey: string;
  chatId?: string;
  crmDealId: string;
  cpqQuoteId: string;
  contractSent: boolean;
  messages: ChatMessage[];
};

export async function openConversation(input: {
  lookupKey: string;
  chatId?: string;
  crmDealId: string;
  cpqQuoteId: string;
  contractSent: boolean;
  messages: ChatMessage[];
}): Promise<string> {
  const { POST } = await import("@/src/app/api/crm/conversations/route");
  const saved = await readJson<{ id: string }>(
    await callRouter(POST, "/api/crm/conversations", { body: input }),
  );
  return saved.id;
}

export async function loadConversation(key: string): Promise<ConversationPayload | undefined> {
  const { GET } = await import("@/src/app/api/crm/conversations/[key]/route");
  const response = await callRouter(
    GET,
    `/api/crm/conversations/${encodeURIComponent(key)}`,
    { params: { key } },
  );
  if (response.status === 404) return undefined;
  return readJson<ConversationPayload>(response);
}

export async function removeConversation(key: string): Promise<void> {
  const { DELETE } = await import("@/src/app/api/crm/conversations/[key]/route");
  await readJson(
    await callRouter(DELETE, `/api/crm/conversations/${encodeURIComponent(key)}`, {
      method: "DELETE",
      params: { key },
    }),
  );
}

type QuotePayload = {
  invoiceId: string;
  summary: {
    total: number;
    specs: { label: string; value: string }[];
    brand: { name: string };
  };
};

type DealPayload = {
  id: string;
  contactId: string;
  cpqQuoteId: string;
};

type ContactPayload = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  optedOut: boolean;
};

export async function loadAgentSession(
  key: string,
): Promise<{ conversationId: string; session: AgentSession } | undefined> {
  const conversation = await loadConversation(key);
  if (!conversation) return undefined;

  const { GET: getDeal } = await import("@/src/app/api/crm/deals/[id]/route");
  const { GET: getContact } = await import("@/src/app/api/crm/contacts/[id]/route");
  const { GET: readQuote } = await import("@/src/app/api/cpq/quotes/[id]/route");

  const deal = await readJson<DealPayload>(
    await callRouter(getDeal, `/api/crm/deals/${conversation.crmDealId}`, {
      params: { id: conversation.crmDealId },
    }),
  );
  const contact = await readJson<ContactPayload>(
    await callRouter(getContact, `/api/crm/contacts/${deal.contactId}`, {
      params: { id: deal.contactId },
    }),
  );
  if (contact.optedOut) return undefined;

  const quote = await readJson<QuotePayload>(
    await callRouter(readQuote, `/api/cpq/quotes/${conversation.cpqQuoteId}`, {
      params: { id: conversation.cpqQuoteId },
    }),
  );

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

export async function saveAgentSession(
  conversationId: string,
  session: AgentSession,
): Promise<void> {
  const { PATCH: patchConversation } = await import("@/src/app/api/crm/conversations/[key]/route");
  await readJson(
    await callRouter(patchConversation, `/api/crm/conversations/${conversationId}`, {
      method: "PATCH",
      params: { key: conversationId },
      body: { contractSent: session.contractSent, messages: session.messages },
    }),
  );
  if (!session.contractSent) return;

  const { PATCH: patchDeal } = await import("@/src/app/api/crm/deals/[id]/route");
  await readJson(
    await callRouter(patchDeal, `/api/crm/deals/${session.crmDealId}`, {
      method: "PATCH",
      params: { id: session.crmDealId },
      body: { status: "invoice_sent" },
    }),
  );
}

export async function optOutContact(key: string): Promise<void> {
  const conversation = await loadConversation(key);
  if (!conversation) return;
  const { GET: getDeal } = await import("@/src/app/api/crm/deals/[id]/route");
  const { PATCH: patchContact } = await import("@/src/app/api/crm/contacts/[id]/route");
  const deal = await readJson<DealPayload>(
    await callRouter(getDeal, `/api/crm/deals/${conversation.crmDealId}`, {
      params: { id: conversation.crmDealId },
    }),
  );
  await readJson(
    await callRouter(patchContact, `/api/crm/contacts/${deal.contactId}`, {
      method: "PATCH",
      params: { id: deal.contactId },
      body: { optedOut: true },
    }),
  );
}
