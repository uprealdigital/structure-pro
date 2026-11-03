"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { copy } from "@/src/features/crm/common/locales/en";

export function CrmMobileBackHeader({ title }: { title: string }) {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/conversations");
  }

  return (
    <header className="relative shrink-0 border-b border-gray-200/80 bg-white lg:hidden">
      <div className="flex items-center gap-2 px-4 py-3.5">
        <span className="flex h-[calc(2rem+2px)] w-5 shrink-0 items-center justify-center" aria-hidden="true">
          <ChevronLeft className="h-5 w-5" strokeWidth={2} />
        </span>
        <h1 className="min-w-0 truncate font-serif text-sm font-semibold text-gray-950">{title}</h1>
      </div>
      <button type="button" aria-label={copy.back} onClick={goBack} className="absolute inset-0 cursor-pointer" />
    </header>
  );
}
