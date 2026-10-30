import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import { quoteSelectionsSchema, type ListedQuote, type QuoteRecord } from "@/src/features/cpq/types";
import { toListedQuote, type QuoteListRow } from "@/src/features/cpq/utils/mappers";
import { describeSelections } from "@/src/features/cpq/utils/pricing";
import { recordQuoteStatusActivity } from "@/src/features/crm/conversations/server/status-activity";
import { quoteStatuses } from "@/src/features/crm/quotes/config/status";
import { createQuoteRevision, readQuoteRevisionsByIds, updateQuoteRevision } from "@/src/features/crm/quotes/db/quote-revision";
import { portalCopy } from "@/src/features/crm/quotes/locales/en";
import { quoteStatusSchema, type QuoteStatus } from "@/src/features/crm/quotes/types";
import { quoteDisplayName, quoteNumberValue } from "@/src/features/crm/quotes/utils/formatting";

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
    .select("id, quote_number")
    .single();

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
  status?: unknown;
};

export function storedQuoteStatus(value: unknown): QuoteStatus {
  if (value === "declined") return "changes_requested";
  const status = quoteStatusSchema.safeParse(value);
  return status.success ? status.data : "draft";
}

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
  const { data, error } = await crm()
    .from("quotes")
    .select("id, invoice_id, quote_number, active_revision_id")
    .eq("id", id)
    .maybeSingle();

  throwIfError(error);
  const row = quoteRow(data);
  if (!row) return undefined;
  const selectionsById = await selectionsByRevision([row]);
  return quoteFromRow(row, selectionsById);
}

export async function readQuotesByIds(ids: string[]): Promise<QuoteRecord[]> {
  if (ids.length === 0) return [];
  const { data, error } = await crm()
    .from("quotes")
    .select("id, invoice_id, quote_number, active_revision_id")
    .in("id", ids);
  throwIfError(error);
  const rows = quoteRows(data);
  const selectionsById = await selectionsByRevision(rows);
  return rows
    .map((row) => quoteFromRow(row, selectionsById))
    .filter((quote): quote is QuoteRecord => quote != null);
}

export async function readListedQuote(id: string): Promise<(ListedQuote & { status: QuoteStatus }) | undefined> {
  const quoteId = id.trim();
  if (!quoteId) return undefined;
  const { data, error } = await crm()
    .from("quotes")
    .select("id, invoice_id, quote_number, active_revision_id, created_at, status")
    .eq("id", quoteId)
    .maybeSingle();

  throwIfError(error);
  const row = quoteRow(data);
  if (!row || typeof row.id !== "string" || typeof row.invoice_id !== "string") return undefined;
  const selectionsById = await selectionsByRevision([row]);
  const selections =
    typeof row.active_revision_id === "string" ? selectionsById.get(row.active_revision_id) : undefined;
  if (!selections) return undefined;
  const listed = toListedQuote({
    id: row.id,
    invoice_id: row.invoice_id,
    quote_number: row.quote_number,
    selections,
    created_at: row.created_at,
  });
  if (!listed) return undefined;
  return { ...listed, status: storedQuoteStatus(row.status) };
}

export async function readQuotes(): Promise<Array<ListedQuote & { status: QuoteStatus }>> {
  const { data, error } = await crm()
    .from("quotes")
    .select("id, invoice_id, quote_number, active_revision_id, created_at, status")
    .order("created_at", { ascending: false });

  throwIfError(error);
  const rows = quoteRows(data);
  const selectionsById = await selectionsByRevision(rows);
  return rows.flatMap((row) => {
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
    return listed ? [{ ...listed, status: storedQuoteStatus(row.status) }] : [];
  });
}

export async function readActiveRevisionId(quoteId: string): Promise<string | undefined> {
  const { data, error } = await crm()
    .from("quotes")
    .select("active_revision_id")
    .eq("id", quoteId)
    .maybeSingle();

  throwIfError(error);
  if (!data || typeof data.active_revision_id !== "string") return undefined;
  return data.active_revision_id;
}

export async function readQuoteStatus(id: string): Promise<QuoteStatus | undefined> {
  const { data, error } = await crm().from("quotes").select("status").eq("id", id).maybeSingle();
  throwIfError(error);
  if (!data) return undefined;
  return storedQuoteStatus(data.status);
}

export async function readQuoteUpdatedAt(id: string): Promise<string | undefined> {
  const { data, error } = await crm().from("quotes").select("updated_at").eq("id", id).maybeSingle();
  throwIfError(error);
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;
  const updatedAt = "updated_at" in data ? data.updated_at : undefined;
  return typeof updatedAt === "string" && updatedAt ? updatedAt : undefined;
}

function quoteLogName(quote: QuoteRecord): string {
  if (!quote.quoteNumber) return portalCopy.quote;
  return quoteDisplayName(quote.quoteNumber, describeSelections(quote.selections).specs);
}

export async function updateQuote(
  id: string,
  patch: { invoiceId?: string; activeRevisionId?: string; status?: QuoteStatus },
): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  let statusActivity: { quoteId: string; name: string; status: string } | undefined;
  if (patch.invoiceId) row.invoice_id = patch.invoiceId;
  if (patch.activeRevisionId) row.active_revision_id = patch.activeRevisionId;
  if (patch.status) {
    const next = quoteStatusSchema.parse(patch.status);
    const current = await readQuoteStatus(id);
    row.status = next;
    if (current && current !== next) {
      const quote = await readQuote(id);
      statusActivity = {
        quoteId: id,
        name: quote ? quoteLogName(quote) : portalCopy.quote,
        status: quoteStatuses[next].label,
      };
    }
  }
  const { error } = await crm().from("quotes").update(row).eq("id", id);
  throwIfError(error);
  if (statusActivity) await recordQuoteStatusActivity(statusActivity);
}

export async function setQuoteStatus(id: string, status: QuoteStatus): Promise<void> {
  const next = quoteStatusSchema.parse(status);
  await updateQuote(id, { status: next });
  const revisionId = await readActiveRevisionId(id);
  if (!revisionId) return;
  await updateQuoteRevision(revisionId, { status: next });
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
