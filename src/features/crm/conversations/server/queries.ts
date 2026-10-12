import "server-only";

import { cache } from "react";
import { getQuoteForPage } from "@/src/features/cpq/server/queries";
import { readCustomer, readCustomers } from "@/src/features/crm/common/db/customer";
import { readDealCustomers, readDealCustomersForCustomer } from "@/src/features/crm/common/db/deal-customer";
import type { DealCustomer } from "@/src/features/crm/common/types";
import { getCustomer } from "@/src/features/crm/common/server/queries";
import { readActivities } from "@/src/features/crm/conversations/db/activity";
import {
  readConversation,
  readConversationById,
  readConversationSummaryByCustomer,
  readConversations,
} from "@/src/features/crm/conversations/db/conversation";
import {
  conversationDealOptionSchema,
  conversationWorkspaceSchema,
  type ConversationDealOption,
  type ConversationInboxItem,
  type ConversationWorkspace,
} from "@/src/features/crm/conversations/types";
import { activityPreview, formatDealMenuDate, productTitle } from "@/src/features/crm/conversations/utils/formatting";
import { toConversationInboxItem, toConversationQuote } from "@/src/features/crm/conversations/utils/mappers";
import { readDeal, readDeals } from "@/src/features/crm/deals/db/deal";
import type { Deal } from "@/src/features/crm/deals/types";
import { contractOnDeal, dealStageFor } from "@/src/features/crm/deals/utils/mappers";

export async function getConversation(key: string) {
  return readConversation(key);
}

export async function getConversationByCustomer(customerId: string) {
  return readConversationSummaryByCustomer(customerId);
}

function byNewest(left: Deal, right: Deal): number {
  return (right.createdAt ?? "").localeCompare(left.createdAt ?? "");
}

function latestPrimaryDeal(links: DealCustomer[], deals: Deal[], customerId: string): Deal | undefined {
  const ids = new Set(
    links.filter((link) => link.customerId === customerId && link.isPrimary).map((link) => link.dealId),
  );
  return deals.filter((deal) => ids.has(deal.id)).sort(byNewest)[0];
}

async function dealOption(
  deal: Deal,
  contractSent: boolean,
  primaryDealCount: number,
  isPrimary: boolean,
): Promise<ConversationDealOption | undefined> {
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
  const specs = quoteRecord?.summary.specs ?? [];
  const onContract = isPrimary && contractOnDeal(deal.status, contractSent, primaryDealCount);
  const option = conversationDealOptionSchema.safeParse({
    id: deal.id,
    title: productTitle(specs) || quoteRecord?.invoiceId || "",
    priceLabel: quoteRecord?.summary.totalLabel ?? "",
    stage: dealStageFor(deal.status, onContract, Boolean(quoteRecord)),
    dateLabel: formatDealMenuDate(deal.createdAt ?? ""),
    deal,
    quote: quote ?? null,
  });
  return option.success ? option.data : undefined;
}

export const getConversationInbox = cache(async (): Promise<ConversationInboxItem[]> => {
  const [summaries, customers, links, deals] = await Promise.all([
    readConversations(),
    readCustomers(),
    readDealCustomers(),
    readDeals(),
  ]);
  const customerById = new Map(customers.map((customer) => [customer.id, customer]));
  const items: ConversationInboxItem[] = [];

  for (const summary of summaries) {
    const customer = customerById.get(summary.customerId);
    if (!customer) continue;
    const deal = latestPrimaryDeal(links, deals, customer.id);
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
  const links = await readDealCustomersForCustomer(customer.id);
  const primaryLinks = links.filter((link) => link.isPrimary);
  if (primaryLinks.length === 0) return undefined;

  const loaded = await Promise.all(links.map((link) => readDeal(link.dealId)));
  const deals = loaded.filter((deal): deal is Deal => deal != null).sort(byNewest);
  const focused = latestPrimaryDeal(links, deals, customer.id);
  if (!focused) return undefined;

  const primaryIds = new Set(primaryLinks.map((link) => link.dealId));
  const options: ConversationDealOption[] = [];
  for (const deal of deals) {
    const option = await dealOption(deal, conversation.contractSent, primaryLinks.length, primaryIds.has(deal.id));
    if (option) options.push(option);
  }
  const focusedOption = options.find((option) => option.id === focused.id) ?? options[0];
  if (!focusedOption) return undefined;

  const workspace = conversationWorkspaceSchema.safeParse({
    id: conversation.id,
    contractSent: conversation.contractSent,
    createdAt: conversation.createdAt ?? "",
    customer,
    deal: focusedOption.deal,
    deals: options,
    activities: conversation.activities,
    quote: focusedOption.quote,
  });
  return workspace.success ? workspace.data : undefined;
}

export async function getAgentSession(key: string) {
  const conversation = await getConversation(key);
  if (!conversation) return undefined;

  const customer = await getCustomer(conversation.customerId);
  if (!customer) throw new Error("Customer not found");
  if (customer.optedOut) return undefined;
  const links = await readDealCustomersForCustomer(customer.id);
  const deals = (await Promise.all(links.map((link) => readDeal(link.dealId)))).filter(
    (deal): deal is Deal => deal != null,
  );
  const deal = latestPrimaryDeal(links, deals, customer.id);
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
