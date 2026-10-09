import "server-only";

import { cache } from "react";
import { getQuoteForPage } from "@/src/features/cpq/server/queries";
import { readCustomer } from "@/src/features/crm/common/db/customer";
import { getCustomer } from "@/src/features/crm/common/server/queries";
import { readActivities } from "@/src/features/crm/conversations/db/activity";
import { readConversation, readConversationById, readConversations } from "@/src/features/crm/conversations/db/conversation";
import {
  conversationWorkspaceSchema,
  type ConversationInboxItem,
  type ConversationWorkspace,
} from "@/src/features/crm/conversations/types";
import { activityPreview } from "@/src/features/crm/conversations/utils/formatting";
import { toConversationInboxItem, toConversationQuote } from "@/src/features/crm/conversations/utils/mappers";
import { readDeal } from "@/src/features/crm/deals/db/deal";
import { getDeal } from "@/src/features/crm/deals/server/queries";

export async function getConversation(key: string) {
  return readConversation(key);
}

export const getConversationInbox = cache(async (): Promise<ConversationInboxItem[]> => {
  const summaries = await readConversations();
  const items: ConversationInboxItem[] = [];

  for (const summary of summaries) {
    const customer = await readCustomer(summary.customerId);
    if (!customer) continue;
    const deal = await readDeal(customer.dealId);
    if (!deal) continue;
    const activities = await readActivities(summary.id);
    const item = toConversationInboxItem({
      summary,
      customer,
      deal,
      preview: activityPreview(activities.at(-1)),
    });
    if (item) items.push(item);
  }

  return items;
});

export async function getConversationWorkspace(id: string): Promise<ConversationWorkspace | undefined> {
  const conversation = await readConversationById(id);
  if (!conversation) return undefined;

  const customer = await readCustomer(conversation.customerId);
  if (!customer) return undefined;
  const deal = await readDeal(customer.dealId);
  if (!deal) return undefined;

  const quoteRecord = await getQuoteForPage(deal.quoteId);
  const quote = quoteRecord
    ? toConversationQuote({
        id: quoteRecord.id,
        invoiceId: quoteRecord.invoiceId,
        totalLabel: quoteRecord.summary.totalLabel,
        specs: quoteRecord.summary.specs,
        lines: quoteRecord.summary.lines,
        imageUrl: quoteRecord.summary.imageUrl,
      })
    : undefined;

  const workspace = conversationWorkspaceSchema.safeParse({
    id: conversation.id,
    contractSent: conversation.contractSent,
    createdAt: conversation.createdAt ?? "",
    customer,
    deal,
    activities: conversation.activities,
    quote: quote ?? null,
  });
  return workspace.success ? workspace.data : undefined;
}

export async function getAgentSession(key: string) {
  const conversation = await getConversation(key);
  if (!conversation) return undefined;

  const customer = await getCustomer(conversation.customerId);
  if (!customer) throw new Error("Customer not found");
  if (customer.optedOut) return undefined;
  const deal = await getDeal(customer.dealId);
  if (!deal) throw new Error("Deal not found");

  const quote = await getQuoteForPage(deal.quoteId);
  if (!quote) throw new Error("Quote not found");

  return {
    conversationId: conversation.id,
    session: {
      fullName: customer.fullName,
      phone: customer.phone,
      email: customer.email,
      chatId: conversation.chatId,
      invoiceId: quote.invoiceId,
      quoteId: deal.quoteId,
      crmDealId: deal.id,
      crmCustomerId: customer.id,
      specLines: quote.summary.specs.map((spec) => `- ${spec.label}: ${spec.value}`).join("\n"),
      total: quote.summary.total,
      brandName: quote.summary.brand.name,
      messages: conversation.activities.map((activity) => ({
        role: activity.role,
        text: activity.text,
      })),
      contractSent: conversation.contractSent,
    },
  };
}
