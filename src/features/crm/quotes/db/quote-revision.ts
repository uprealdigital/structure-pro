import { db, getSupabase } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import { quoteSelectionsSchema } from "@/src/features/cpq/types";
import {
  quoteCommunicationSchema,
  quoteRevisionPatchSchema,
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
  "id, quote_id, revision_number, status, config, config_changes, communication, renders, created_at, updated_at";
const revisionColumnsWithoutRenders =
  "id, quote_id, revision_number, status, config, config_changes, communication, created_at, updated_at";
const legacyRevisionColumns =
  "id, quote_id, revision_number, status, selections, communication, created_at, updated_at";
const renderBucket = "quote-revision-renders";
const maxRenderBytes = 8 * 1024 * 1024;

function missingConfigColumn(error: { message: string } | null): boolean {
  if (!error) return false;
  const message = error.message.toLowerCase();
  return (
    (message.includes("config") || message.includes("selections")) &&
    (message.includes("schema cache") || message.includes("could not find") || message.includes("does not exist"))
  );
}

function missingRendersColumn(error: { message: string } | null): boolean {
  if (!error) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("renders") &&
    (message.includes("schema cache") || message.includes("could not find") || message.includes("does not exist"))
  );
}

function rowsFrom(data: unknown): QuoteRevisionRow[] {
  if (!data) return [];
  return Array.isArray(data) ? (data as QuoteRevisionRow[]) : [data as QuoteRevisionRow];
}

async function revisionRows(
  apply: (columns: string) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<QuoteRevisionRow[]> {
  const current = await apply(revisionColumns);
  if (missingRendersColumn(current.error)) {
    return revisionRowsFrom(apply, revisionColumnsWithoutRenders);
  }
  if (!missingConfigColumn(current.error)) {
    throwIfError(current.error);
    return rowsFrom(current.data);
  }
  return revisionRowsFrom(apply, legacyRevisionColumns);
}

async function revisionRowsFrom(
  apply: (columns: string) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
  columns: string,
): Promise<QuoteRevisionRow[]> {
  const current = await apply(columns);
  if (!missingConfigColumn(current.error)) {
    throwIfError(current.error);
    return rowsFrom(current.data);
  }
  const legacy = await apply(legacyRevisionColumns);
  throwIfError(legacy.error);
  return rowsFrom(legacy.data).map((row) => ({
    ...row,
    config: row.config ?? row.selections,
    config_changes: row.config_changes ?? {},
  }));
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
  const previousRow = missingConfigColumn(latest.error)
    ? await crm()
        .from("quote_revisions")
        .select("revision_number, selections")
        .eq("quote_id", revision.quoteId)
        .order("revision_number", { ascending: false })
        .limit(1)
        .maybeSingle()
    : latest;
  if (missingConfigColumn(latest.error)) throwIfError(previousRow.error);
  else throwIfError(latest.error);
  const latestRow = previousRow.data as { revision_number?: unknown; config?: unknown; selections?: unknown } | null;
  const current = typeof latestRow?.revision_number === "number" ? latestRow.revision_number : 0;
  const previous = quoteSelectionsSchema.safeParse(latestRow?.config ?? latestRow?.selections);
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
  if (!missingConfigColumn(inserted.error)) {
    throwIfError(inserted.error);
    return savedRevision(inserted.data as QuoteRevisionRow);
  }
  const legacy = await crm()
    .from("quote_revisions")
    .insert({
      quote_id: revision.quoteId,
      revision_number: current + 1,
      status: revision.status,
      selections: revision.selections,
    })
    .select(legacyRevisionColumns)
    .single();
  throwIfError(legacy.error);
  return savedRevision({
    ...(legacy.data as QuoteRevisionRow),
    config: revision.selections,
    config_changes: configChanges,
  });
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
  patch: { status: unknown },
): Promise<QuoteRevision> {
  const next = quoteRevisionPatchSchema.parse(patch);
  const rows = await revisionRows((columns) =>
    crm()
      .from("quote_revisions")
      .update({
        status: next.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(columns)
      .single(),
  );
  return savedRevision(rows[0]);
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
  if (missingRendersColumn(error)) {
    throw new Error("Run supabase/migrate-crm-quote-revision-renders.sql in the Supabase SQL editor.");
  }
  throwIfError(error);
  return next;
}
