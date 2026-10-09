import "server-only";

import { cache } from "react";
import { getQuoteForPage } from "@/src/features/cpq/server/queries";
import { readCustomers } from "@/src/features/crm/common/db/customer";
import { readConversations } from "@/src/features/crm/conversations/db/conversation";
import { readDeal, readDeals } from "@/src/features/crm/deals/db/deal";
import type { DealBoardItem } from "@/src/features/crm/deals/types";
import { dealDetailLine, dealProductName } from "@/src/features/crm/deals/utils/formatting";
import { toDealBoardItem } from "@/src/features/crm/deals/utils/mappers";

export async function getDeal(id: string) {
  return readDeal(id);
}

export async function getDealCount(): Promise<number> {
  const deals = await readDeals();
  return deals.length;
}

export const getDealBoard = cache(async (): Promise<DealBoardItem[]> => {
  const [deals, conversations, customers] = await Promise.all([
    readDeals(),
    readConversations(),
    readCustomers(),
  ]);
  const customerById = new Map(customers.map((customer) => [customer.id, customer]));
  const customersByDeal = new Map<string, typeof customers>();
  for (const customer of customers) {
    const related = customersByDeal.get(customer.dealId) ?? [];
    related.push(customer);
    customersByDeal.set(customer.dealId, related);
  }

  const conversationByDeal = new Map<string, (typeof conversations)[number]>();
  for (const conversation of conversations) {
    const customer = customerById.get(conversation.customerId);
    if (!customer || conversationByDeal.has(customer.dealId)) continue;
    conversationByDeal.set(customer.dealId, conversation);
  }

  const contractDeals = new Set<string>();
  for (const conversation of conversations) {
    if (!conversation.contractSent) continue;
    const customer = customerById.get(conversation.customerId);
    if (customer) contractDeals.add(customer.dealId);
  }

  const items: DealBoardItem[] = [];
  for (const deal of deals) {
    const related = customersByDeal.get(deal.id) ?? [];
    if (related.length === 0) continue;
    const quote = await getQuoteForPage(deal.quoteId);
    const specs = quote?.summary.specs ?? [];
    const conversation = conversationByDeal.get(deal.id);
    const item = toDealBoardItem({
      deal,
      contactName: related.map((customer) => customer.fullName).join(", "),
      productName: dealProductName(specs),
      detail: dealDetailLine(specs),
      valueLabel: quote?.summary.totalLabel ?? "",
      contractSent: contractDeals.has(deal.id),
      hasQuote: Boolean(quote),
      conversationId: conversation?.id,
    });
    if (item) items.push(item);
  }

  return items;
});
