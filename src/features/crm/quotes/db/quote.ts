import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import { quoteSelectionsSchema, type ListedQuote, type QuoteRecord } from "@/src/features/cpq/types";
import { toListedQuote, type QuoteListRow } from "@/src/features/cpq/utils/mappers";
import { createQuoteRevision, readQuoteRevisionsByIds } from "@/src/features/crm/quotes/db/quote-revision";

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

type QuoteRow = {
  id?: unknown;
  invoice_id?: unknown;
  active_revision_id?: unknown;
  created_at?: string | null;
};

async function selectionsByRevision(rows: QuoteRow[]) {
  const ids = rows
    .map((row) => (typeof row.active_revision_id === "string" ? row.active_revision_id : ""))
    .filter((id) => id.length > 0);
  const revisions = await readQuoteRevisionsByIds(ids);
  return new Map(revisions.map((revision) => [revision.id, revision.selections]));
}

function quoteFromRow(
  row: QuoteRow,
  selectionsById: Map<string, QuoteRecord["selections"]>,
): QuoteRecord | undefined {
  const selections =
    typeof row.active_revision_id === "string" ? selectionsById.get(row.active_revision_id) : undefined;
  if (!selections) return undefined;
  return quoteRecord({ id: row.id, invoice_id: row.invoice_id, selections });
}

export async function readQuote(id: string): Promise<QuoteRecord | undefined> {
  const { data, error } = await crm()
    .from("quotes")
    .select("id, invoice_id, active_revision_id")
    .eq("id", id)
    .maybeSingle();

  throwIfError(error);
  if (!data) return undefined;
  const selectionsById = await selectionsByRevision([data]);
  return quoteFromRow(data, selectionsById);
}

export async function readQuotesByIds(ids: string[]): Promise<QuoteRecord[]> {
  if (ids.length === 0) return [];
  const { data, error } = await crm()
    .from("quotes")
    .select("id, invoice_id, active_revision_id")
    .in("id", ids);
  throwIfError(error);
  const rows = (data ?? []) as QuoteRow[];
  const selectionsById = await selectionsByRevision(rows);
  return rows
    .map((row) => quoteFromRow(row, selectionsById))
    .filter((quote): quote is QuoteRecord => quote != null);
}

export async function readQuotes(): Promise<ListedQuote[]> {
  const { data, error } = await crm()
    .from("quotes")
    .select("id, invoice_id, active_revision_id, created_at")
    .order("created_at", { ascending: false });

  throwIfError(error);
  const rows = (data ?? []) as QuoteRow[];
  const selectionsById = await selectionsByRevision(rows);
  return rows
    .flatMap((row) => {
      if (typeof row.id !== "string" || typeof row.invoice_id !== "string") return [];
      const selections =
        typeof row.active_revision_id === "string" ? selectionsById.get(row.active_revision_id) : undefined;
      if (!selections) return [];
      const listed = toListedQuote({
        id: row.id,
        invoice_id: row.invoice_id,
        selections,
        created_at: row.created_at,
      });
      return listed ? [listed] : [];
    });
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
  patch: { invoiceId?: string; activeRevisionId?: string },
): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.invoiceId) row.invoice_id = patch.invoiceId;
  if (patch.activeRevisionId) row.active_revision_id = patch.activeRevisionId;
  const { error } = await crm().from("quotes").update(row).eq("id", id);
  throwIfError(error);
}

export async function deleteQuote(id: string): Promise<void> {
  await crm().from("quotes").update({ active_revision_id: null }).eq("id", id);
  const { error } = await crm().from("quotes").delete().eq("id", id);
  throwIfError(error);
}
