"use client";

import { CircleAlert } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useRef } from "react";
import { CATALOG } from "@/src/features/cpq/utils/catalog";
import { useQuoteStream } from "@/src/features/crm/quotes/hooks/use-quote-stream";
import { portalCopy } from "@/src/features/crm/quotes/locales/en";
import type { QuoteChangeEvent, QuotePortalMode } from "@/src/features/crm/quotes/types";

function routeQuoteId(value: string | string[] | undefined): string {
  const id = Array.isArray(value) ? value[0] : value;
  return id ?? "";
}

function portalModeFromLocation(mode: QuotePortalMode | undefined): QuotePortalMode {
  if (mode) return mode;
  if (typeof window === "undefined") return "external";
  return new URLSearchParams(window.location.search).get("mode") === "internal" ? "internal" : "external";
}

function quoteIsReady(event: QuoteChangeEvent, mode: QuotePortalMode, quoteId: string) {
  if (event.id !== quoteId || event.kind === "delete") return false;
  if (mode === "external") return event.status != null && event.status !== "draft";
  return true;
}

export function QuoteUnavailable({
  quoteId,
  mode,
}: {
  quoteId?: string;
  mode?: QuotePortalMode;
}) {
  const router = useRouter();
  const params = useParams();
  const id = quoteId || routeQuoteId(params.id);
  const refreshing = useRef(false);

  useQuoteStream((event) => {
    if (!id || refreshing.current) return;
    if (!quoteIsReady(event, portalModeFromLocation(mode), id)) return;
    refreshing.current = true;
    router.refresh();
    window.setTimeout(() => {
      refreshing.current = false;
    }, 2000);
  }, id || "pending");

  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-[#f9f9fb] px-6 py-16">
      <section className="flex w-full max-w-md flex-col items-center rounded-xl border border-[#e8e8ea] bg-white px-8 py-10 text-center shadow-md">
        <div className="flex items-center gap-3">
          <div className="rounded-sm bg-black p-2 font-serif text-base leading-none font-bold tracking-widest text-white shadow-md">
            {CATALOG.brand.mark}
          </div>
          <div className="text-left">
            <p className="font-serif text-sm leading-snug font-bold tracking-wide text-[#1a1c1d]">
              {CATALOG.brand.name}
            </p>
            <p className="text-[11px] font-semibold tracking-wider text-[#655d55] uppercase">
              {CATALOG.brand.region}
            </p>
          </div>
        </div>
        <span className="mt-8 flex h-12 w-12 items-center justify-center rounded-full bg-[#fde68a] text-[#92400e]">
          <CircleAlert className="h-7 w-7" strokeWidth={2.25} aria-hidden="true" />
        </span>
        <p className="mt-4 max-w-xs font-serif text-xl leading-snug font-semibold tracking-tight text-[#1a1c1d]">
          {portalCopy.notFound}
        </p>
      </section>
    </main>
  );
}
