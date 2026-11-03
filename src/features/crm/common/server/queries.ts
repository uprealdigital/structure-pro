import "server-only";

import { readCustomer } from "@/src/features/crm/common/db/customer";
import { readDealerships } from "@/src/features/crm/common/db/dealership";
import { readOrganizations } from "@/src/features/crm/common/db/organization";
import { organizationDirectory } from "@/src/features/crm/common/utils/organizations";

export async function getCustomer(id: string) {
  return readCustomer(id);
}

export async function getOrganizationDirectory() {
  const [organizations, dealerships] = await Promise.all([readOrganizations(), readDealerships()]);
  return organizationDirectory(organizations, dealerships);
}
