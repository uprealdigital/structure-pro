import "server-only";

import { cache } from "react";
import { describeSelections } from "@/src/features/cpq/utils/pricing";
import { readCustomers } from "@/src/features/crm/common/db/customer";
import { readConversations } from "@/src/features/crm/conversations/db/conversation";
import { readDeals } from "@/src/features/crm/deals/db/deal";
import { readQuotes } from "@/src/features/crm/quotes/db/quote";
import type { QuoteCustomer, QuoteListItem } from "@/src/features/crm/quotes/types";
import { toQuoteListItem } from "@/src/features/crm/quotes/utils/mappers";

export const getQuoteList = cache(async (): Promise<QuoteListItem[]> => {
  const [quotes, deals, customers, conversations] = await Promise.all([
    readQuotes(),
    readDeals(),
    readCustomers(),
    readConversations(),
  ]);

  const customerById = new Map(customers.map((customer) => [customer.id, customer]));
  const customersByDeal = new Map<string, typeof customers>();
  for (const customer of customers) {
    const related = customersByDeal.get(customer.dealId) ?? [];
    related.push(customer);
    customersByDeal.set(customer.dealId, related);
  }
  const dealsByQuote = new Map<string, typeof deals>();
  for (const deal of deals) {
    const related = dealsByQuote.get(deal.quoteId) ?? [];
    related.push(deal);
    dealsByQuote.set(deal.quoteId, related);
  }
  const dealById = new Map(deals.map((deal) => [deal.id, deal]));
  const contractQuoteIds = new Set<string>();
  for (const conversation of conversations) {
    if (!conversation.contractSent) continue;
    const customer = customerById.get(conversation.customerId);
    const deal = customer ? dealById.get(customer.dealId) : undefined;
    if (deal) contractQuoteIds.add(deal.quoteId);
  }

  const items: QuoteListItem[] = [];
  for (const quote of quotes) {
    const described = describeSelections(quote.selections);
    const related = dealsByQuote.get(quote.id) ?? [];
    const seen = new Set<string>();
    const quoteCustomers: QuoteCustomer[] = [];
    for (const deal of related) {
      for (const customer of customersByDeal.get(deal.id) ?? []) {
        if (seen.has(customer.id)) continue;
        seen.add(customer.id);
        quoteCustomers.push({ id: customer.id, name: customer.fullName });
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
