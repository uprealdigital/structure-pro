import type { ReactNode } from "react";
import { CrmNav } from "@/src/features/crm/common/components/crm-nav";

export default function CrmLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden bg-[#f9f9fb] text-gray-950">
      <CrmNav />
      {children}
    </div>
  );
}
