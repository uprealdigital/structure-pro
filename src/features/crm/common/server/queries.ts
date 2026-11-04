import "server-only";

import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import { readCustomer } from "@/src/features/crm/common/db/customer";
import { readDealerships } from "@/src/features/crm/common/db/dealership";
import { readOrganizations } from "@/src/features/crm/common/db/organization";
import { navCountsSchema, type NavCounts } from "@/src/features/crm/common/types";
import { organizationDirectory } from "@/src/features/crm/common/utils/organizations";

export async function getCustomer(id: string) {
  return readCustomer(id);
}

export async function getOrganizationDirectory() {
  const [organizations, dealerships] = await Promise.all([readOrganizations(), readDealerships()]);
  return organizationDirectory(organizations, dealerships);
}

export async function getNavCounts(): Promise<NavCounts> {
  const { data, error } = await db("crm").rpc("get_nav_counts");
  throwIfError(error);
  return navCountsSchema.parse(data);
}
