import type { Dealership, Organization, OrganizationDirectoryEntry } from "@/src/features/crm/common/types";

export function organizationDirectory(
  organizations: Organization[],
  dealerships: Dealership[],
): OrganizationDirectoryEntry[] {
  return organizations.map((organization) => ({
    ...organization,
    dealerships: dealerships.filter((dealership) => dealership.organizationId === organization.id),
  }));
}
