import "server-only";

import { cache } from "react";
import { describeSelections } from "@/src/features/cpq/utils/pricing";
import { readCustomers } from "@/src/features/crm/common/db/customer";
import { readDealCustomers, readDealCustomersForDeals } from "@/src/features/crm/common/db/deal-customer";
import { readConversations } from "@/src/features/crm/conversations/db/conversation";
import { canonicalConversationByCustomer } from "@/src/features/crm/conversations/utils/conversations";
import { readDeals, readDealsByQuoteId } from "@/src/features/crm/deals/db/deal";
import { contractOnDeal, quoteIssued } from "@/src/features/crm/deals/utils/mappers";
import { readActiveRevisionId, readQuote, readQuotes } from "@/src/features/crm/quotes/db/quote";
import { readQuoteRevision } from "@/src/features/crm/quotes/db/quote-revision";
import type { QuoteCustomer, QuoteListItem, QuotePortal, QuotePortalCustomer, QuotePortalRecipient } from "@/src/features/crm/quotes/types";
import { quotePortalDealName, quotePortalStatus } from "@/src/features/crm/quotes/utils/formatting";
import { toQuoteListItem, toQuotePortal } from "@/src/features/crm/quotes/utils/mappers";

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
  const conversationByCustomer = canonicalConversationByCustomer(conversations);
  const primaryDealsByCustomer = new Map<string, number>();
  for (const link of links) {
    if (!link.isPrimary) continue;
    primaryDealsByCustomer.set(link.customerId, (primaryDealsByCustomer.get(link.customerId) ?? 0) + 1);
  }
  const contractQuoteIds = new Set<string>();
  for (const link of links) {
    if (!link.isPrimary) continue;
    const conversation = conversationByCustomer.get(link.customerId);
    if (!conversation?.contractSent) continue;
    const deal = dealById.get(link.dealId);
    if (!deal) continue;
    const primaryDealCount = primaryDealsByCustomer.get(link.customerId) ?? 1;
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
      invoiceSent: related.some((deal) => quoteIssued(deal.status)),
    });
    if (item) items.push(item);
  }

  return items;
});

export async function getQuoteCount(): Promise<number> {
  return (await getQuoteList()).length;
}

export const getQuotePortal = cache(async (id: string): Promise<QuotePortal | undefined> => {
  const quoteId = id.trim();
  if (!quoteId) return undefined;
  const quote = await readQuote(quoteId);
  if (!quote) return undefined;
  const revisionId = await readActiveRevisionId(quoteId);
  if (!revisionId) return undefined;
  const revision = await readQuoteRevision(revisionId);
  if (!revision || revision.quoteId !== quoteId) return undefined;
  const deals = await readDealsByQuoteId(quoteId);
  const [links, customers] = await Promise.all([
    readDealCustomersForDeals(deals.map((deal) => deal.id)),
    readCustomers(),
  ]);
  const customerById = new Map(customers.map((customer) => [customer.id, customer]));
  const seen = new Set<string>();
  const quoteCustomers: QuotePortalCustomer[] = [];
  const recipients: QuotePortalRecipient[] = [];
  const ordered = [...links].sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary));
  for (const link of ordered) {
    const customer = customerById.get(link.customerId);
    if (!customer) continue;
    recipients.push({ dealId: link.dealId, isPrimary: link.isPrimary, customer });
    if (seen.has(link.customerId)) {
      if (link.isPrimary) {
        const existing = quoteCustomers.find((item) => item.id === link.customerId);
        if (existing) existing.primary = true;
      }
      continue;
    }
    seen.add(link.customerId);
    quoteCustomers.push({ id: customer.id, name: customer.fullName, primary: link.isPrimary });
  }
  const described = describeSelections(revision.selections);
  return toQuotePortal({
    id: quote.id,
    invoiceId: quote.invoiceId,
    revisionId: revision.id,
    dealName: quotePortalDealName(deals, described.specs, quote.invoiceId),
    revisionNumber: revision.revisionNumber,
    createdAt: revision.createdAt,
    imageUrl: described.style.image,
    monthly: described.estimate.rto,
    months: described.estimate.rtoMonths,
    lines: described.estimate.lines,
    specs: described.specs,
    total: described.estimate.total,
    zip: revision.selections.zip,
    won: deals.length > 0 && deals.every((deal) => deal.status === "deal_won"),
    customers: quoteCustomers,
    recipients,
    dealIds: deals.map((deal) => deal.id),
    selections: revision.selections,
    communication: revision.communication,
    status: quotePortalStatus(deals, revision.status),
  });
});
