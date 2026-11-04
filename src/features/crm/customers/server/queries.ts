import "server-only";

import { cache } from "react";
import { readCustomer, readCustomers } from "@/src/features/crm/common/db/customer";
import { readDealCustomersForCustomer } from "@/src/features/crm/common/db/deal-customer";
import { readConversationSummaryByCustomer } from "@/src/features/crm/conversations/db/conversation";
import { readDealsByIds } from "@/src/features/crm/deals/db/deal";
import {
  customerDealWireSchema,
  customerDetailWireSchema,
  customerListWireSchema,
  type CustomerDetailWire,
  type CustomerListItem,
  type CustomerListWire,
} from "@/src/features/crm/customers/types";
import { toCustomerListItem } from "@/src/features/crm/customers/utils/mappers";
import { readQuoteSummaries } from "@/src/features/crm/quotes/server/queries";

export const getCustomerList = cache(async (): Promise<CustomerListItem[]> => {
  const customers = await readCustomers();
  return customers
    .map(toCustomerListItem)
    .filter((customer): customer is CustomerListItem => customer != null);
});

export async function getCustomerCount(): Promise<number> {
  return (await getCustomerList()).length;
}

export async function getCustomerDirectory(): Promise<CustomerListWire[]> {
  const customers = await readCustomers();
  const items: CustomerListWire[] = [];
  for (const customer of customers) {
    const parsed = customerListWireSchema.safeParse({
      id: customer.id,
      full_name: customer.fullName,
      phone: customer.phone,
      email: customer.email,
      created_at: customer.createdAt ?? "",
    });
    if (parsed.success) items.push(parsed.data);
  }
  return items;
}

export async function getCustomerDetail(id: string): Promise<CustomerDetailWire | undefined> {
  const customer = await readCustomer(id);
  if (!customer) return undefined;
  const [links, conversation] = await Promise.all([
    readDealCustomersForCustomer(customer.id),
    readConversationSummaryByCustomer(customer.id),
  ]);
  const deals = await readDealsByIds(links.map((link) => link.dealId));
  const quotes = await readQuoteSummaries(deals.map((deal) => deal.quoteId));
  const parsedDeals = deals.flatMap((deal) => {
    const parsed = customerDealWireSchema.safeParse({
      id: deal.id,
      name: deal.name,
      status: deal.status,
      quote: deal.quoteId ? (quotes.get(deal.quoteId) ?? null) : null,
    });
    return parsed.success ? [parsed.data] : [];
  });
  const parsed = customerDetailWireSchema.safeParse({
    id: customer.id,
    full_name: customer.fullName,
    phone: customer.phone,
    email: customer.email,
    created_at: customer.createdAt ?? "",
    deals: parsedDeals,
    conversation: conversation ? { id: conversation.id, updated_at: conversation.updatedAt } : null,
  });
  return parsed.success ? parsed.data : undefined;
}
