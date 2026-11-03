import { ArrowRight } from "lucide-react";
import { headers } from "next/headers";
import { demoUrl } from "@/src/features/website/config/site";
import { copy } from "@/src/features/website/locales/en";
import { appOriginFrom } from "@/src/features/website/utils/hosts";

export const websiteButtonClass =
  "inline-flex items-center justify-center gap-2 rounded bg-black font-semibold tracking-wider text-white uppercase shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-colors hover:bg-[#2f3132] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";

export async function WebsiteMenu() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";
  const loginHref = appOriginFrom(host);

  return (
    <header className="sticky top-0 z-50 bg-[#f9f9fb]/80 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:h-20 sm:px-6 sm:py-0 lg:px-12">
        <a href="/" className="flex min-w-0 items-center gap-3">
          <img src="/website/logo.png" alt="" className="h-8 w-8 shrink-0 rounded-lg object-contain" />
          <span className="truncate font-serif text-lg leading-none font-semibold tracking-tight">
            {copy.brand}
          </span>
        </a>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <a
            href={loginHref}
            className="px-2 py-2 text-[11px] font-semibold tracking-wider text-[#44474a] uppercase transition-colors hover:text-[#1a1c1d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:px-3 sm:text-xs"
          >
            {copy.login}
          </a>
          <a
            href={demoUrl}
            target="_blank"
            rel="noreferrer"
            className={`${websiteButtonClass} px-3 py-2 text-[11px] sm:hidden`}
          >
            {copy.freeDemo}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </a>
          <a
            href={demoUrl}
            target="_blank"
            rel="noreferrer"
            className={`${websiteButtonClass} px-5 py-2.5 text-xs max-sm:hidden`}
          >
            {copy.bookDemo}
          </a>
        </div>
      </div>
    </header>
  );
}
