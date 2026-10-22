import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuotePortal } from "@/src/features/crm/quotes/components/quote-portal";
import { getQuotePortal } from "@/src/features/crm/quotes/server/queries";
import { quotePortalMode } from "@/src/features/crm/quotes/utils/formatting";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ revision?: string | string[] }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { revision } = await searchParams;
  const quote = await getQuotePortal(id, firstQueryValue(revision));
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
  const quote = await getQuotePortal(id, firstQueryValue(revision));
  if (!quote) notFound();
  return <QuotePortal quote={quote} mode={quotePortalMode(mode)} />;
}
