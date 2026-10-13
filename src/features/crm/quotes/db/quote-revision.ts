import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import {
  quoteRevisionPatchSchema,
  quoteRevisionWriteSchema,
  type QuoteRevision,
} from "@/src/features/crm/quotes/types";
import { toQuoteRevision, type QuoteRevisionRow } from "@/src/features/crm/quotes/utils/mappers";

function crm() {
  return db("crm");
}

const revisionColumns =
  "id, quote_id, revision_number, status, selections, created_at, updated_at";

export async function createQuoteRevision(input: {
  quoteId: string;
  selections: unknown;
  status?: unknown;
}): Promise<QuoteRevision> {
  const revision = quoteRevisionWriteSchema.parse(input);
  const { data: latest, error: latestError } = await crm()
    .from("quote_revisions")
    .select("revision_number")
    .eq("quote_id", revision.quoteId)
    .order("revision_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  throwIfError(latestError);
  const current =
    latest && typeof latest.revision_number === "number" ? latest.revision_number : 0;

  const { data, error } = await crm()
    .from("quote_revisions")
    .insert({
      quote_id: revision.quoteId,
      revision_number: current + 1,
      status: revision.status,
      selections: revision.selections,
    })
    .select(revisionColumns)
    .single();

  throwIfError(error);
  const saved = data ? toQuoteRevision(data as QuoteRevisionRow) : undefined;
  if (!saved) throw new Error("Quote revision was not saved");
  return saved;
}

export async function readQuoteRevision(id: string): Promise<QuoteRevision | undefined> {
  const { data, error } = await crm()
    .from("quote_revisions")
    .select(revisionColumns)
    .eq("id", id)
    .maybeSingle();

  throwIfError(error);
  if (!data) return undefined;
  return toQuoteRevision(data as QuoteRevisionRow);
}

export async function readQuoteRevisions(quoteId: string): Promise<QuoteRevision[]> {
  const { data, error } = await crm()
    .from("quote_revisions")
    .select(revisionColumns)
    .eq("quote_id", quoteId)
    .order("revision_number", { ascending: true });

  throwIfError(error);
  return ((data ?? []) as QuoteRevisionRow[])
    .map(toQuoteRevision)
    .filter((revision): revision is QuoteRevision => revision != null);
}

export async function updateQuoteRevision(
  id: string,
  patch: { status: unknown },
): Promise<QuoteRevision> {
  const next = quoteRevisionPatchSchema.parse(patch);
  const { data, error } = await crm()
    .from("quote_revisions")
    .update({
      status: next.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(revisionColumns)
    .single();

  throwIfError(error);
  const saved = data ? toQuoteRevision(data as QuoteRevisionRow) : undefined;
  if (!saved) throw new Error("Quote revision was not saved");
  return saved;
}

export async function deleteQuoteRevision(id: string): Promise<void> {
  const { error } = await crm().from("quote_revisions").delete().eq("id", id);
  throwIfError(error);
}
