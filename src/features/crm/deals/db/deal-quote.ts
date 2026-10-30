import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import { dealQuoteLinkSchema, type DealQuoteLink } from "@/src/features/crm/deals/types";
import { toDealQuoteLink, type DealQuoteRow } from "@/src/features/crm/deals/utils/mappers";

function crm() {
  return db("crm");
}

const linkColumns = "deal_id, quote_id, created_at";

function linksFrom(rows: unknown): (DealQuoteLink & { createdAt: string })[] {
  return (rows as DealQuoteRow[])
    .map(toDealQuoteLink)
    .filter((link): link is DealQuoteLink & { createdAt: string } => link != null);
}

export async function createDealQuote(input: { dealId: string; quoteId: string }): Promise<void> {
  const link = dealQuoteLinkSchema.parse(input);
  const { error } = await crm()
    .from("deal_quotes")
    .upsert(
      { deal_id: link.dealId, quote_id: link.quoteId },
      { onConflict: "deal_id,quote_id", ignoreDuplicates: true },
    );
  throwIfError(error);
}

export async function deleteDealQuote(input: { dealId: string; quoteId: string }): Promise<void> {
  const link = dealQuoteLinkSchema.parse(input);
  const { error } = await crm()
    .from("deal_quotes")
    .delete()
    .eq("deal_id", link.dealId)
    .eq("quote_id", link.quoteId);
  throwIfError(error);
}

export async function readDealQuotes(dealId: string): Promise<(DealQuoteLink & { createdAt: string })[]> {
  if (!dealId) return [];
  const { data, error } = await crm()
    .from("deal_quotes")
    .select(linkColumns)
    .eq("deal_id", dealId)
    .order("created_at", { ascending: true });
  throwIfError(error);
  return linksFrom(data ?? []);
}

export async function readDealQuotesForQuote(
  quoteId: string,
): Promise<(DealQuoteLink & { createdAt: string })[]> {
  if (!quoteId) return [];
  const { data, error } = await crm().from("deal_quotes").select(linkColumns).eq("quote_id", quoteId);
  throwIfError(error);
  return linksFrom(data ?? []);
}

export async function readAllDealQuotes(): Promise<(DealQuoteLink & { createdAt: string })[]> {
  const { data, error } = await crm()
    .from("deal_quotes")
    .select(linkColumns)
    .order("created_at", { ascending: true });
  throwIfError(error);
  return linksFrom(data ?? []);
}
