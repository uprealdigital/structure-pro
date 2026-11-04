import type { ReactNode } from "react";
import { CrmMobileShell } from "@/src/features/crm/common/components/crm-mobile-nav";
import { CrmNav } from "@/src/features/crm/common/components/crm-nav";
import { getNavCounts, getOrganizationDirectory } from "@/src/features/crm/common/server/queries";
import type { NavCounts, OrganizationDirectoryEntry } from "@/src/features/crm/common/types";

const emptyCounts: NavCounts = {
  conversationCount: 0,
  unreadActivityCount: 0,
  dealCount: 0,
  customerCount: 0,
  quoteCount: 0,
};

export default async function CrmLayout({ children }: { children: ReactNode }) {
  let organizations: OrganizationDirectoryEntry[] = [];
  let counts = emptyCounts;
  try {
    organizations = await getOrganizationDirectory();
  } catch {
    organizations = [];
  }
  try {
    counts = await getNavCounts();
  } catch {
    counts = emptyCounts;
  }

  return (
    <CrmMobileShell organizations={organizations} counts={counts}>
      <CrmNav organizations={organizations} counts={counts} />
      {children}
    </CrmMobileShell>
  );
}
