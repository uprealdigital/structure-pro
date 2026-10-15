import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import { quoteSelectionsSchema, type ListedQuote, type QuoteRecord } from "@/src/features/cpq/types";
import { toListedQuote, type QuoteListRow } from "@/src/features/cpq/utils/mappers";
import { createQuoteRevision } from "@/src/features/crm/quotes/db/quote-revision";

function crm() {
  return db("crm");
}

export async function createQuote(input: {
  invoiceId: string;
  selections: unknown;
}): Promise<string> {
  const selections = quoteSelectionsSchema.parse(input.selections);
  const { data, error } = await crm()
    .from("quotes")
    .insert({
      invoice_id: input.invoiceId,
      selections,
    })
    .select("id")
    .single();

  throwIfError(error);
  if (!data?.id || typeof data.id !== "string") {
    throw new Error("Quote was not saved");
  }

  const revision = await createQuoteRevision({
    quoteId: data.id,
    selections,
    status: "draft",
  });
  await updateQuote(data.id, { activeRevisionId: revision.id });
  return data.id;
}

function quoteRecord(row: {
  id?: unknown;
  invoice_id?: unknown;
  selections?: unknown;
}): QuoteRecord | undefined {
  if (typeof row.id !== "string" || typeof row.invoice_id !== "string") return undefined;
  const selections = quoteSelectionsSchema.safeParse(row.selections);
  if (!selections.success) return undefined;
  return { id: row.id, invoiceId: row.invoice_id, selections: selections.data };
}

export async function readQuote(id: string): Promise<QuoteRecord | undefined> {
  const { data, error } = await crm()
    .from("quotes")
    .select("id, invoice_id, selections")
    .eq("id", id)
    .maybeSingle();

  throwIfError(error);
  if (!data) return undefined;
  return quoteRecord(data);
}

export async function readQuotesByIds(ids: string[]): Promise<QuoteRecord[]> {
  if (ids.length === 0) return [];
  const { data, error } = await crm().from("quotes").select("id, invoice_id, selections").in("id", ids);
  throwIfError(error);
  return (data ?? [])
    .map((row) => quoteRecord(row))
    .filter((quote): quote is QuoteRecord => quote != null);
}

export async function readQuotes(): Promise<ListedQuote[]> {
  const { data, error } = await crm()
    .from("quotes")
    .select("id, invoice_id, selections, created_at")
    .order("created_at", { ascending: false });

  throwIfError(error);
  return ((data ?? []) as QuoteListRow[])
    .map(toListedQuote)
    .filter((quote): quote is ListedQuote => quote != null);
}

export async function readActiveRevisionId(quoteId: string): Promise<string | undefined> {
  const { data, error } = await crm()
    .from("quotes")
    .select("active_revision_id")
    .eq("id", quoteId)
    .maybeSingle();

  if (error || !data || typeof data.active_revision_id !== "string") return undefined;
  return data.active_revision_id;
}

export async function updateQuote(
  id: string,
  patch: { invoiceId?: string; selections?: unknown; activeRevisionId?: string },
): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.invoiceId) row.invoice_id = patch.invoiceId;
  if (patch.selections) row.selections = quoteSelectionsSchema.parse(patch.selections);
  if (patch.activeRevisionId) row.active_revision_id = patch.activeRevisionId;
  const { error } = await crm().from("quotes").update(row).eq("id", id);
  throwIfError(error);
}

export async function deleteQuote(id: string): Promise<void> {
  await crm().from("quotes").update({ active_revision_id: null }).eq("id", id);
  const { error } = await crm().from("quotes").delete().eq("id", id);
  throwIfError(error);
}
