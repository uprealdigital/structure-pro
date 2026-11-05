import { describeSelections } from "@/src/features/cpq/utils/pricing";
import type { Customer } from "@/src/features/crm/common/types";
import type { LoadedQuotePortal, QuotePortalCustomer } from "@/src/features/crm/quotes/types";
import {
  formatQuoteCash,
  formatQuoteDate,
  quoteDisplayName,
  quoteMonthsLabel,
  quotePortalDealName,
  quoteVersionLabel,
  quoteVersionShortLabel,
} from "@/src/features/crm/quotes/utils/formatting";

function customerFrom(person: QuotePortalCustomer): Customer {
  return {
    id: person.id,
    fullName: person.full_name,
    phone: person.phone,
    email: person.email,
    optedOut: person.opted_out,
    ...(person.active_deal_id ? { activeDealId: person.active_deal_id } : {}),
    createdAt: person.created_at,
  };
}

export function quotePortalDeals(quote: LoadedQuotePortal) {
  const seen = new Set(quote.deals.map((deal) => deal.id));
  return [...quote.deals, ...quote.deal_quotes.flatMap((link) => (seen.has(link.deal.id) ? [] : [link.deal]))];
}

export function quotePortalView(quote: LoadedQuotePortal) {
  const revision = quote.quote_revision;
  const described = describeSelections(revision.config);
  const deals = quotePortalDeals(quote);
  const won = deals.length > 0 && deals.every((deal) => deal.status === "deal_won");
  const memberships = deals
    .flatMap((deal) =>
      deal.deal_customers.map((link) => ({
        dealId: deal.id,
        isPrimary: link.is_primary,
        customer: customerFrom(link.customer),
      })),
    )
    .sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary));
  const people: Array<{ id: string; fullName: string; phone: string; email: string; primary: boolean }> = [];
  for (const membership of memberships) {
    const existing = people.find((person) => person.id === membership.customer.id);
    if (existing) {
      if (membership.isPrimary) existing.primary = true;
      continue;
    }
    people.push({
      id: membership.customer.id,
      fullName: membership.customer.fullName,
      phone: membership.customer.phone,
      email: membership.customer.email,
      primary: membership.isPrimary,
    });
  }
  return {
    dealName: quote.quote_number
      ? quoteDisplayName(quote.quote_number, described.specs)
      : quotePortalDealName(deals, described.specs, quote.invoice_id),
    versionLabel: quoteVersionLabel(revision.revision_number),
    versionShortLabel: quoteVersionShortLabel(revision.revision_number),
    dateLabel: formatQuoteDate(revision.created_at),
    imageUrl: described.style.image,
    monthlyLabel: `${formatQuoteCash(described.estimate.rto)}/mo`,
    monthsLabel: quoteMonthsLabel(described.estimate.rtoMonths),
    lines: described.estimate.lines.map((line) => ({
      label: line.label,
      amountLabel: formatQuoteCash(line.amount),
    })),
    totalLabel: formatQuoteCash(described.estimate.total),
    zip: revision.config.zip,
    won,
    confirmedAt: quote.status === "deposit_paid" || won ? quote.updated_at : "",
    dealIds: deals.map((deal) => deal.id),
    invoiceId: quote.invoice_id,
    memberships,
    people,
  };
}
