"use client";

import { CircleAlert } from "lucide-react";
import { portalCopy } from "@/src/features/crm/quotes/locales/en";

export function QuoteUpdatePill({ pending, onView }: { pending: boolean; onView: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-full items-center gap-2.5 rounded-full border border-[#eab308] bg-white py-1.5 pr-1.5 pl-3 shadow-lg">
        <CircleAlert className="h-4 w-4 shrink-0 text-[#a16207]" strokeWidth={2.5} aria-hidden="true" />
        <p className="text-xs font-medium text-[#1a1c1d]">{portalCopy.quoteUpdated}</p>
        <button
          type="button"
          disabled={pending}
          onClick={onView}
          className="cursor-pointer rounded-full bg-black px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-white transition-colors hover:bg-[#1b1c1d] disabled:cursor-default disabled:opacity-60"
        >
          {pending ? portalCopy.loadingLatestRevision : portalCopy.viewLatestRevision}
        </button>
      </div>
    </div>
  );
}
