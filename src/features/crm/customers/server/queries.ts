import "server-only";

import { cache } from "react";
import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
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
  const { count, error } = await db("crm").from("customers").select("id", { count: "exact", head: true });
  throwIfError(error);
  return count ?? 0;
}
