import { db, getSupabase } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import {
  suggestionPatchSchema,
  suggestionWriteSchema,
  type Suggestion,
  type SuggestionConfigChanges,
} from "@/src/features/ai/types";
import { toSuggestion, type SuggestionRow } from "@/src/features/ai/utils/mappers";
import { z } from "zod";

const columns = "id, deal_id, message_ids, intent, status, config_changes, preview_image_url, created_at";
const columnsWithoutPreview = "id, deal_id, message_ids, intent, status, config_changes, created_at";
const previewBucket = "ai-suggestions";
const maxPreviewBytes = 2 * 1024 * 1024;
const previewMigration = "Run supabase/migrate-suggestion-preview.sql in the Supabase SQL editor.";

function ai() {
  return db("ai");
}

function uniqueViolation(error: { code?: string; message: string }): boolean {
  return error.code === "23505" || /duplicate key|unique/i.test(error.message);
}

function missingPreviewColumn(error: { message: string } | null): boolean {
  if (!error) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("preview_image_url") &&
    (message.includes("does not exist") || message.includes("schema cache") || message.includes("could not find"))
  );
}

async function suggestionQuery(
  run: (selected: string) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<{ data: unknown; error: { message: string } | null }> {
  const result = await run(columns);
  if (!missingPreviewColumn(result.error)) return result;
  return run(columnsWithoutPreview);
}

async function ensurePreviewBucket(): Promise<void> {
  const { error } = await getSupabase().storage.createBucket(previewBucket, { public: true });
  if (!error || /already exists/i.test(error.message)) return;
  throw new Error(error.message);
}

export async function createSuggestion(input: {
  dealId: string;
  messageIds: number[];
  intent: "revision" | "new_quote";
  configChanges: SuggestionConfigChanges;
}): Promise<Suggestion> {
  const suggestion = suggestionWriteSchema.parse(input);
  const inserted = await suggestionQuery((selected) =>
    ai()
      .from("suggestions")
      .insert({
        deal_id: suggestion.dealId,
        message_ids: suggestion.messageIds,
        intent: suggestion.intent,
        status: "pending",
        config_changes: suggestion.configChanges,
      })
      .select(selected)
      .single(),
  );

  if (inserted.error && uniqueViolation(inserted.error)) {
    const pending = (await readSuggestions(suggestion.dealId)).find(
      (row) => row.intent === suggestion.intent && row.status === "pending",
    );
    if (!pending) throw new Error(inserted.error.message);
    const updated = await updateSuggestion(pending.id, {
      messageIds: suggestion.messageIds,
      configChanges: suggestion.configChanges,
    });
    if (!updated) throw new Error(inserted.error.message);
    return updated;
  }

  throwIfError(inserted.error);
  const created = toSuggestion(inserted.data as SuggestionRow);
  if (!created) throw new Error("Suggestion was not saved");
  return created;
}

export async function readSuggestions(dealId: string): Promise<Suggestion[]> {
  const { data, error } = await suggestionQuery((selected) =>
    ai().from("suggestions").select(selected).eq("deal_id", dealId).order("created_at", { ascending: true }),
  );
  throwIfError(error);
  const rows = Array.isArray(data) ? data : [];
  return rows.flatMap((row) => {
    const suggestion = toSuggestion(row as SuggestionRow);
    return suggestion ? [suggestion] : [];
  });
}

export async function updateSuggestion(
  id: string,
  patch: {
    messageIds?: number[];
    configChanges?: SuggestionConfigChanges;
    previewImageUrl?: string | null;
    status?: "pending" | "applied" | "dismissed";
  },
): Promise<Suggestion | undefined> {
  const next = suggestionPatchSchema.parse(patch);
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (next.messageIds) row.message_ids = next.messageIds;
  if (next.configChanges) row.config_changes = next.configChanges;
  if (next.messageIds || next.configChanges) row.preview_image_url = null;
  if (next.previewImageUrl !== undefined) row.preview_image_url = next.previewImageUrl;
  if (next.status) row.status = next.status;
  const fromStatus = next.status === "pending" ? "dismissed" : "pending";

  const first = await ai()
    .from("suggestions")
    .update(row)
    .eq("id", id)
    .eq("status", fromStatus)
    .select(columns)
    .maybeSingle();
  const updated = missingPreviewColumn(first.error)
    ? await ai()
        .from("suggestions")
        .update(withoutPreview(row))
        .eq("id", id)
        .eq("status", fromStatus)
        .select(columnsWithoutPreview)
        .maybeSingle()
    : first;
  throwIfError(updated.error);
  if (!updated.data) return undefined;
  return toSuggestion(updated.data as SuggestionRow);
}

function withoutPreview(row: Record<string, unknown>): Record<string, unknown> {
  const next = { ...row };
  delete next.preview_image_url;
  return next;
}

export async function storeSuggestionPreview(id: string, bytes: Uint8Array): Promise<Suggestion | undefined> {
  if (!z.string().uuid().safeParse(id).success) throw new Error("A suggestion is required");
  if (bytes.byteLength <= 0 || bytes.byteLength > maxPreviewBytes) throw new Error("That preview is too large.");
  await ensurePreviewBucket();
  const existing = await getSupabase().storage.from(previewBucket).list(id);
  const stale = (existing.data ?? []).map((file) => `${id}/${file.name}`);
  if (stale.length > 0) await getSupabase().storage.from(previewBucket).remove(stale);
  const path = `${id}/${crypto.randomUUID()}.png`;
  const { error } = await getSupabase().storage.from(previewBucket).upload(path, Buffer.from(bytes), {
    contentType: "image/png",
    upsert: false,
  });
  throwIfError(error);
  const previewImageUrl = getSupabase().storage.from(previewBucket).getPublicUrl(path).data.publicUrl;
  const { data, error: updateError } = await ai()
    .from("suggestions")
    .update({ preview_image_url: previewImageUrl, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending")
    .select(columns)
    .maybeSingle();
  if (missingPreviewColumn(updateError)) throw new Error(previewMigration);
  throwIfError(updateError);
  if (!data) return undefined;
  return toSuggestion(data as SuggestionRow);
}
