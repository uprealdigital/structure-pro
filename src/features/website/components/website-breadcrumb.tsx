import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { copy } from "@/src/features/website/locales/en";

export function WebsiteBreadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label={copy.breadcrumb}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-[#655d55]">
        <li>
          <Link href="/" className="transition-colors hover:text-[#1a1c1d]">
            {copy.home}
          </Link>
        </li>
        <li aria-hidden="true" className="flex items-center text-[#c5c6c9]">
          <ChevronRight className="size-3.5" />
        </li>
        <li className="font-medium text-[#1a1c1d]" aria-current="page">
          {current}
        </li>
      </ol>
    </nav>
  );
}
