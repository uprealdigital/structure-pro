import { db, getSupabase } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import { quoteSelectionsSchema } from "@/src/features/cpq/types";
import {
  quoteCommunicationSchema,
  quoteRevisionPatchSchema,
  quoteRevisionPhotosShareSchema,
  quoteRevisionRendersSchema,
  quoteRevisionWriteSchema,
  type QuoteCommunication,
  type QuoteRevision,
  type QuoteRevisionRenders,
} from "@/src/features/crm/quotes/types";
import { changedConfig } from "@/src/features/crm/quotes/utils/config-changes";
import { toQuoteRevision, type QuoteRevisionRow } from "@/src/features/crm/quotes/utils/mappers";
import { z } from "zod";

function crm() {
  return db("crm");
}

const revisionColumns =
  "id, quote_id, revision_number, status, config, config_changes, communication, renders, shared_photos_at, shared_quote_at, created_at, updated_at";
const renderBucket = "quote-revision-renders";
const maxRenderBytes = 8 * 1024 * 1024;

function rowsFrom(data: unknown): QuoteRevisionRow[] {
  if (!data) return [];
  return Array.isArray(data) ? (data as QuoteRevisionRow[]) : [data as QuoteRevisionRow];
}

async function revisionRows(
  apply: (columns: string) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<QuoteRevisionRow[]> {
  const current = await apply(revisionColumns);
  throwIfError(current.error);
  return rowsFrom(current.data);
}

function savedRevision(row: QuoteRevisionRow | undefined): QuoteRevision {
  const saved = row ? toQuoteRevision(row) : undefined;
  if (!saved) throw new Error("Quote revision was not saved");
  return saved;
}

export async function createQuoteRevision(input: {
  quoteId: string;
  selections: unknown;
  status?: unknown;
}): Promise<QuoteRevision> {
  const revision = quoteRevisionWriteSchema.parse(input);
  const latest = await crm()
    .from("quote_revisions")
    .select("revision_number, config")
    .eq("quote_id", revision.quoteId)
    .order("revision_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIfError(latest.error);
  const latestRow = latest.data as { revision_number?: unknown; config?: unknown } | null;
  const current = typeof latestRow?.revision_number === "number" ? latestRow.revision_number : 0;
  const previous = quoteSelectionsSchema.safeParse(latestRow?.config);
  const configChanges = changedConfig(previous.success ? previous.data : undefined, revision.selections);
  const inserted = await crm()
    .from("quote_revisions")
    .insert({
      quote_id: revision.quoteId,
      revision_number: current + 1,
      status: revision.status,
      config: revision.selections,
      config_changes: configChanges,
    })
    .select(revisionColumns)
    .single();
  throwIfError(inserted.error);
  return savedRevision(inserted.data as QuoteRevisionRow);
}

function toRevisions(rows: QuoteRevisionRow[]): QuoteRevision[] {
  return rows.map(toQuoteRevision).filter((revision): revision is QuoteRevision => revision != null);
}

export async function readQuoteRevisionsByIds(ids: string[]): Promise<QuoteRevision[]> {
  if (ids.length === 0) return [];
  const rows = await revisionRows((columns) => crm().from("quote_revisions").select(columns).in("id", ids));
  return toRevisions(rows);
}

export async function readQuoteRevision(id: string): Promise<QuoteRevision | undefined> {
  const rows = await revisionRows((columns) =>
    crm().from("quote_revisions").select(columns).eq("id", id).maybeSingle(),
  );
  return rows[0] ? toQuoteRevision(rows[0]) : undefined;
}

export async function readQuoteRevisions(quoteId: string): Promise<QuoteRevision[]> {
  const rows = await revisionRows((columns) =>
    crm().from("quote_revisions").select(columns).eq("quote_id", quoteId).order("revision_number", { ascending: true }),
  );
  return toRevisions(rows);
}

export async function updateQuoteRevision(
  id: string,
  patch: { status: unknown; sharedQuoteAt?: unknown },
): Promise<QuoteRevision> {
  const next = quoteRevisionPatchSchema.parse(patch);
  const updatedAt = new Date().toISOString();
  const update: {
    status: string;
    updated_at: string;
    shared_quote_at?: string;
  } = {
    status: next.status,
    updated_at: updatedAt,
  };
  if (next.sharedQuoteAt) update.shared_quote_at = next.sharedQuoteAt;
  const saved = await crm().from("quote_revisions").update(update).eq("id", id).select(revisionColumns).single();
  throwIfError(saved.error);
  return savedRevision(saved.data as QuoteRevisionRow);
}

export async function updateQuoteRevisionPhotosShare(input: {
  revisionId: string;
  sharedPhotosAt: string;
}): Promise<QuoteRevision> {
  const next = quoteRevisionPhotosShareSchema.parse(input);
  const saved = await crm()
    .from("quote_revisions")
    .update({
      shared_photos_at: next.sharedPhotosAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", next.revisionId)
    .select(revisionColumns)
    .single();
  throwIfError(saved.error);
  return savedRevision(saved.data as QuoteRevisionRow);
}

export async function updateQuoteRevisionCommunication(
  id: string,
  communication: QuoteCommunication,
): Promise<void> {
  const next = quoteCommunicationSchema.parse(communication);
  const { error } = await crm()
    .from("quote_revisions")
    .update({
      communication: next,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  throwIfError(error);
}

export async function deleteQuoteRevision(id: string): Promise<void> {
  const { error } = await crm().from("quote_revisions").delete().eq("id", id);
  throwIfError(error);
}

async function ensureRenderBucket(): Promise<void> {
  const { error } = await getSupabase().storage.createBucket(renderBucket, { public: true });
  if (!error || /already exists/i.test(error.message)) return;
  throw new Error(error.message);
}

export async function storeQuoteRevisionRender(input: {
  revisionId: string;
  size: "full" | "medium" | "small";
  bytes: Uint8Array;
}): Promise<string> {
  if (!z.string().uuid().safeParse(input.revisionId).success) {
    throw new Error("A quote revision is required");
  }
  if (input.bytes.byteLength <= 0 || input.bytes.byteLength > maxRenderBytes) {
    throw new Error("That render is too large.");
  }
  await ensureRenderBucket();
  const path = `${input.revisionId}/${input.size}.jpg`;
  const { error } = await getSupabase().storage.from(renderBucket).upload(path, Buffer.from(input.bytes), {
    contentType: "image/jpeg",
    upsert: true,
  });
  throwIfError(error);
  return getSupabase().storage.from(renderBucket).getPublicUrl(path).data.publicUrl;
}

export async function updateQuoteRevisionRenders(id: string, renders: unknown): Promise<QuoteRevisionRenders> {
  const next = quoteRevisionRendersSchema.parse(renders);
  const { error } = await crm()
    .from("quote_revisions")
    .update({
      renders: next,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  throwIfError(error);
  return next;
}
