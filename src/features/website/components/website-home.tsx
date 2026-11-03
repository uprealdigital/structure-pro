import { ArrowRight } from "lucide-react";
import { WebsiteFooter } from "@/src/features/website/components/website-footer";
import { WebsiteMenu, websiteButtonClass } from "@/src/features/website/components/website-menu";
import { demoUrl } from "@/src/features/website/config/site";
import { copy } from "@/src/features/website/locales/en";

export function WebsiteHome() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#f9f9fb] text-[#1a1c1d]">
      <WebsiteMenu />

      <main id="overview" className="w-full">
        <section className="relative overflow-hidden px-4 py-14 sm:px-6 sm:py-16 lg:px-12 lg:py-24">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(#1a1c1d_1px,transparent_1px)] opacity-[0.03] [background-size:24px_24px]"
          />
          <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center text-center">
            <h1 className="max-w-4xl font-serif text-3xl leading-[1.15] font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              {copy.headlineLead}
              <br />
              {copy.headlineAccent}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-[#44474a] sm:text-lg">{copy.subtitle}</p>
            <a
              href={demoUrl}
              target="_blank"
              rel="noreferrer"
              className={`${websiteButtonClass} mt-8 w-full px-8 py-3.5 text-xs shadow-md sm:w-auto`}
            >
              <span>{copy.bookDemo}</span>
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
            <img
              src="/website/product.png"
              alt={copy.productAlt}
              className="mt-12 h-auto w-full max-w-full rounded-xl border border-[#c5c6c9]/30 shadow-2xl sm:w-auto"
            />
          </div>
        </section>
      </main>

      <WebsiteFooter />
    </div>
  );
}
