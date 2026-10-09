import type { ReactNode } from "react";
import { copy } from "@/src/features/crm/common/locales/en";

export function Bone({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

export function SkeletonStatus({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{copy.loading}</span>
      {children}
    </div>
  );
}
