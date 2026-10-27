import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { QuotePortal } from "@/src/features/crm/quotes/components/quote-portal";
import { getQuotePortal } from "@/src/features/crm/quotes/server/queries";
import type { QuotePortal as QuotePortalData } from "@/src/features/crm/quotes/types";
import { quotePortalMode } from "@/src/features/crm/quotes/utils/formatting";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string | string[] }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { mode } = await searchParams;
  const quote = await publishedQuote(id, quotePortalMode(mode));
  return { title: quote ? `${quote.dealName} — Quote` : "Quote" };
}

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function QuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string | string[]; revision?: string | string[] }>;
}) {
  const { id } = await params;
  const { mode, revision } = await searchParams;
  const portalMode = quotePortalMode(mode);
  if (firstQueryValue(revision)) redirect(portalMode === "internal" ? `/quote/${id}?mode=internal` : `/quote/${id}`);
  const quote = await publishedQuote(id, portalMode);
  if (!quote) notFound();
  return <QuotePortal quote={quote} mode={portalMode} />;
}

async function publishedQuote(
  id: string,
  mode: ReturnType<typeof quotePortalMode>,
): Promise<QuotePortalData | undefined> {
  const quote = await getQuotePortal(id);
  if (!quote || (mode === "external" && quote.status === "draft")) return undefined;
  return quote;
}
