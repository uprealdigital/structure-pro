import "server-only";

import { cache } from "react";
import { describeSelections } from "@/src/features/cpq/utils/pricing";
import { readCustomers } from "@/src/features/crm/common/db/customer";
import { readDealCustomers } from "@/src/features/crm/common/db/deal-customer";
import { readConversations } from "@/src/features/crm/conversations/db/conversation";
import { readDeals } from "@/src/features/crm/deals/db/deal";
import { contractOnDeal } from "@/src/features/crm/deals/utils/mappers";
import { readQuotes } from "@/src/features/crm/quotes/db/quote";
import type { QuoteCustomer, QuoteListItem } from "@/src/features/crm/quotes/types";
import { toQuoteListItem } from "@/src/features/crm/quotes/utils/mappers";

export const getQuoteList = cache(async (): Promise<QuoteListItem[]> => {
  const [quotes, deals, customers, conversations, links] = await Promise.all([
    readQuotes(),
    readDeals(),
    readCustomers(),
    readConversations(),
    readDealCustomers(),
  ]);

  const customerById = new Map(customers.map((customer) => [customer.id, customer]));
  const customersByDeal = new Map<string, { customer: (typeof customers)[number]; isPrimary: boolean }[]>();
  for (const link of links) {
    const customer = customerById.get(link.customerId);
    if (!customer) continue;
    const related = customersByDeal.get(link.dealId) ?? [];
    related.push({ customer, isPrimary: link.isPrimary });
    customersByDeal.set(link.dealId, related);
  }
  const dealsByQuote = new Map<string, typeof deals>();
  for (const deal of deals) {
    const related = dealsByQuote.get(deal.quoteId) ?? [];
    related.push(deal);
    dealsByQuote.set(deal.quoteId, related);
  }
  const dealById = new Map(deals.map((deal) => [deal.id, deal]));
  const conversationByCustomer = new Map(conversations.map((conversation) => [conversation.customerId, conversation]));
  const contractQuoteIds = new Set<string>();
  for (const link of links) {
    if (!link.isPrimary) continue;
    const conversation = conversationByCustomer.get(link.customerId);
    if (!conversation?.contractSent) continue;
    const deal = dealById.get(link.dealId);
    if (!deal) continue;
    const primaryDealCount = links.filter(
      (item) => item.customerId === link.customerId && item.isPrimary,
    ).length;
    if (contractOnDeal(deal.status, true, primaryDealCount)) contractQuoteIds.add(deal.quoteId);
  }

  const items: QuoteListItem[] = [];
  for (const quote of quotes) {
    const described = describeSelections(quote.selections);
    const related = dealsByQuote.get(quote.id) ?? [];
    const seen = new Set<string>();
    const quoteCustomers: QuoteCustomer[] = [];
    for (const deal of related) {
      const people = (customersByDeal.get(deal.id) ?? []).sort(
        (left, right) => Number(right.isPrimary) - Number(left.isPrimary),
      );
      for (const entry of people) {
        if (seen.has(entry.customer.id)) continue;
        seen.add(entry.customer.id);
        quoteCustomers.push({ id: entry.customer.id, name: entry.customer.fullName });
      }
    }
    const item = toQuoteListItem({
      id: quote.id,
      invoiceId: quote.invoiceId,
      createdAt: quote.createdAt,
      specs: described.specs,
      total: described.estimate.total,
      monthly: described.estimate.rto,
      customers: quoteCustomers,
      contractSent: contractQuoteIds.has(quote.id),
      invoiceSent: related.some((deal) => deal.status === "invoice_sent"),
    });
    if (item) items.push(item);
  }

  return items;
});

export async function getQuoteCount(): Promise<number> {
  return (await getQuoteList()).length;
}
