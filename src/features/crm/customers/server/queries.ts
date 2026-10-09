import "server-only";

import { cache } from "react";
import { readCustomers } from "@/src/features/crm/common/db/customer";
import type { CustomerListItem } from "@/src/features/crm/customers/types";
import { toCustomerListItem } from "@/src/features/crm/customers/utils/mappers";

export const getCustomerList = cache(async (): Promise<CustomerListItem[]> => {
  const customers = await readCustomers();
  return customers
    .map(toCustomerListItem)
    .filter((customer): customer is CustomerListItem => customer != null);
});

export async function getCustomerCount(): Promise<number> {
  return (await getCustomerList()).length;
}
