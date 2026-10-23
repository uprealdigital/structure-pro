import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import { quoteSelectionsSchema, type ListedQuote, type QuoteRecord } from "@/src/features/cpq/types";
import { toListedQuote, type QuoteListRow } from "@/src/features/cpq/utils/mappers";
import { createQuoteRevision, readQuoteRevisionsByIds } from "@/src/features/crm/quotes/db/quote-revision";
import { quoteRecordStatusSchema, type QuoteRecordStatus } from "@/src/features/crm/quotes/types";
import { quoteNumberValue } from "@/src/features/crm/quotes/utils/formatting";

function crm() {
  return db("crm");
}

export async function createQuote(input: {
  invoiceId: string;
  selections: unknown;
}): Promise<string> {
  const selections = quoteSelectionsSchema.parse(input.selections);
  const { data, error } = await quoteQuery(
    (columns) =>
      crm()
        .from("quotes")
        .insert({
          invoice_id: input.invoiceId,
        })
        .select(columns)
        .single(),
    "id, quote_number",
  );

  throwIfError(error);
  const saved = quoteRow(data);
  if (!saved || typeof saved.id !== "string") {
    throw new Error("Quote was not saved");
  }

  const revision = await createQuoteRevision({
    quoteId: saved.id,
    selections,
    status: "draft",
  });
  await updateQuote(saved.id, { activeRevisionId: revision.id });
  return saved.id;
}

function missingQuoteNumber(error: { message: string } | null): boolean {
  if (!error) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("quote_number") &&
    (message.includes("does not exist") || message.includes("schema cache") || message.includes("could not find"))
  );
}

function withoutQuoteNumber(columns: string): string {
  return columns
    .split(",")
    .map((column) => column.trim())
    .filter((column) => column !== "quote_number")
    .join(", ");
}

async function quoteQuery(
  run: (columns: string) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
  columns: string,
): Promise<{ data: unknown; error: { message: string } | null }> {
  const result = await run(columns);
  if (!missingQuoteNumber(result.error)) return result;
  return run(withoutQuoteNumber(columns));
}

function quoteRow(data: unknown): QuoteRow | undefined {
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;
  return data as QuoteRow;
}

function quoteRows(data: unknown): QuoteRow[] {
  return Array.isArray(data) ? data.filter((row): row is QuoteRow => Boolean(row) && typeof row === "object") : [];
}

function quoteRecord(row: {
  id?: unknown;
  invoice_id?: unknown;
  quote_number?: unknown;
  selections?: unknown;
}): QuoteRecord | undefined {
  if (typeof row.id !== "string" || typeof row.invoice_id !== "string") return undefined;
  const selections = quoteSelectionsSchema.safeParse(row.selections);
  if (!selections.success) return undefined;
  const quoteNumber = quoteNumberValue(row.quote_number);
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    ...(quoteNumber ? { quoteNumber } : {}),
    selections: selections.data,
  };
}

type QuoteRow = {
  id?: unknown;
  invoice_id?: unknown;
  quote_number?: unknown;
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
  return quoteRecord({ id: row.id, invoice_id: row.invoice_id, quote_number: row.quote_number, selections });
}

export async function readQuote(id: string): Promise<QuoteRecord | undefined> {
  const { data, error } = await quoteQuery(
    (columns) => crm().from("quotes").select(columns).eq("id", id).maybeSingle(),
    "id, invoice_id, quote_number, active_revision_id",
  );

  throwIfError(error);
  const row = quoteRow(data);
  if (!row) return undefined;
  const selectionsById = await selectionsByRevision([row]);
  return quoteFromRow(row, selectionsById);
}

export async function readQuotesByIds(ids: string[]): Promise<QuoteRecord[]> {
  if (ids.length === 0) return [];
  const { data, error } = await quoteQuery(
    (columns) => crm().from("quotes").select(columns).in("id", ids),
    "id, invoice_id, quote_number, active_revision_id",
  );
  throwIfError(error);
  const rows = quoteRows(data);
  const selectionsById = await selectionsByRevision(rows);
  return rows
    .map((row) => quoteFromRow(row, selectionsById))
    .filter((quote): quote is QuoteRecord => quote != null);
}

export async function readQuotes(): Promise<ListedQuote[]> {
  const { data, error } = await quoteQuery(
    (columns) => crm().from("quotes").select(columns).order("created_at", { ascending: false }),
    "id, invoice_id, quote_number, active_revision_id, created_at",
  );

  throwIfError(error);
  const rows = quoteRows(data);
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
        quote_number: row.quote_number,
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

function missingQuoteStatus(error: { message: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("quotes.status") ||
    (message.includes("status") &&
      (message.includes("schema cache") || message.includes("could not find") || message.includes("does not exist")))
  );
}

export async function readQuoteStatus(id: string): Promise<QuoteRecordStatus | undefined> {
  const { data, error } = await crm().from("quotes").select("status").eq("id", id).maybeSingle();
  if (missingQuoteStatus(error)) return undefined;
  throwIfError(error);
  if (!data) return undefined;
  const status = quoteRecordStatusSchema.safeParse(data.status);
  return status.success ? status.data : "draft";
}

export async function updateQuote(
  id: string,
  patch: { invoiceId?: string; activeRevisionId?: string; status?: QuoteRecordStatus },
): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.invoiceId) row.invoice_id = patch.invoiceId;
  if (patch.activeRevisionId) row.active_revision_id = patch.activeRevisionId;
  if (patch.status) row.status = quoteRecordStatusSchema.parse(patch.status);
  const { error } = await crm().from("quotes").update(row).eq("id", id);
  throwIfError(error);
}

export async function markQuoteSent(id: string): Promise<void> {
  const current = await readQuoteStatus(id);
  if (current !== "draft") return;
  await updateQuote(id, { status: "sent" });
}

export async function deleteQuote(id: string): Promise<void> {
  await crm().from("quotes").update({ active_revision_id: null }).eq("id", id);
  const { error } = await crm().from("quotes").delete().eq("id", id);
  throwIfError(error);
}
