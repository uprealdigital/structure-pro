import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuotePortal } from "@/src/features/crm/quotes/components/quote-portal";
import { getQuotePortal } from "@/src/features/crm/quotes/server/queries";
import { quotePortalMode } from "@/src/features/crm/quotes/utils/formatting";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const quote = await getQuotePortal(id);
  return { title: quote ? `${quote.dealName} — Quote` : "Quote" };
}

export default async function QuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string | string[] }>;
}) {
  const { id } = await params;
  const { mode } = await searchParams;
  const quote = await getQuotePortal(id);
  if (!quote) notFound();
  return <QuotePortal quote={quote} mode={quotePortalMode(mode)} />;
}
