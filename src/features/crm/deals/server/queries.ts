import "server-only";

import { cache } from "react";
import { getQuoteForPage } from "@/src/features/cpq/server/queries";
import { readCustomers } from "@/src/features/crm/common/db/customer";
import { readDealCustomers } from "@/src/features/crm/common/db/deal-customer";
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
  const [deals, conversations, customers, links] = await Promise.all([
    readDeals(),
    readConversations(),
    readCustomers(),
    readDealCustomers(),
  ]);
  const customerById = new Map(customers.map((customer) => [customer.id, customer]));
  const conversationByCustomer = new Map(conversations.map((conversation) => [conversation.customerId, conversation]));
  const customersByDeal = new Map<string, { customer: (typeof customers)[number]; isPrimary: boolean }[]>();
  for (const link of links) {
    const customer = customerById.get(link.customerId);
    if (!customer) continue;
    const related = customersByDeal.get(link.dealId) ?? [];
    related.push({ customer, isPrimary: link.isPrimary });
    customersByDeal.set(link.dealId, related);
  }

  const items: DealBoardItem[] = [];
  for (const deal of deals) {
    const related = (customersByDeal.get(deal.id) ?? []).sort(
      (left, right) => Number(right.isPrimary) - Number(left.isPrimary),
    );
    if (related.length === 0) continue;
    const primary = related.find((entry) => entry.isPrimary)?.customer;
    const conversation = primary ? conversationByCustomer.get(primary.id) : undefined;
    const quote = await getQuoteForPage(deal.quoteId);
    const specs = quote?.summary.specs ?? [];
    const item = toDealBoardItem({
      deal,
      contactName: related.map((entry) => entry.customer.fullName).join(", "),
      productName: dealProductName(specs),
      detail: dealDetailLine(specs),
      valueLabel: quote?.summary.totalLabel ?? "",
      conversationId: conversation?.id,
    });
    if (item) items.push(item);
  }

  return items;
});
