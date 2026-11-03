import type { ReactNode } from "react";
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
    <div className="flex min-h-0 flex-1 overflow-hidden bg-[#f9f9fb] text-gray-950">
      <CrmNav organizations={organizations} />
      {children}
    </div>
  );
}
