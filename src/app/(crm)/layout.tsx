import type { ReactNode } from "react";
import { CrmMobileShell } from "@/src/features/crm/common/components/crm-mobile-nav";
import { CrmNav } from "@/src/features/crm/common/components/crm-nav";
import { getOrganizationDirectory } from "@/src/features/crm/common/server/queries";
import type { OrganizationDirectoryEntry } from "@/src/features/crm/common/types";

export default async function CrmLayout({ children }: { children: ReactNode }) {
  let organizations: OrganizationDirectoryEntry[] = [];
  try {
    organizations = await getOrganizationDirectory();
  } catch {
    organizations = [];
  }

  return (
    <CrmMobileShell organizations={organizations}>
      <CrmNav organizations={organizations} />
      {children}
    </CrmMobileShell>
  );
}
