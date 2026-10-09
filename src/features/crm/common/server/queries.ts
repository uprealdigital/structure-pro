import "server-only";

import { readCustomer } from "@/src/features/crm/common/db/customer";

export async function getCustomer(id: string) {
  return readCustomer(id);
}
