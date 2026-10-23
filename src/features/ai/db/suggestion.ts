import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import {
  suggestionPatchSchema,
  suggestionWriteSchema,
  type Suggestion,
  type SuggestionConfigChanges,
} from "@/src/features/ai/types";
import { toSuggestion, type SuggestionRow } from "@/src/features/ai/utils/mappers";

const columns = "id, deal_id, message_ids, intent, status, config_changes, created_at";

function ai() {
  return db("ai");
}

function uniqueViolation(error: { code?: string; message: string }): boolean {
  return error.code === "23505" || /duplicate key|unique/i.test(error.message);
}

export async function createSuggestion(input: {
  dealId: string;
  messageIds: number[];
  intent: "revision" | "new_quote";
  configChanges: SuggestionConfigChanges;
}): Promise<Suggestion> {
  const suggestion = suggestionWriteSchema.parse(input);
  const inserted = await ai()
    .from("suggestions")
    .insert({
      deal_id: suggestion.dealId,
      message_ids: suggestion.messageIds,
      intent: suggestion.intent,
      status: "pending",
      config_changes: suggestion.configChanges,
    })
    .select(columns)
    .single();

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
  const { data, error } = await ai()
    .from("suggestions")
    .select(columns)
    .eq("deal_id", dealId)
    .order("created_at", { ascending: true });
  throwIfError(error);
  return (data ?? []).flatMap((row) => {
    const suggestion = toSuggestion(row as SuggestionRow);
    return suggestion ? [suggestion] : [];
  });
}

export async function updateSuggestion(
  id: string,
  patch: {
    messageIds?: number[];
    configChanges?: SuggestionConfigChanges;
    status?: "applied" | "dismissed";
  },
): Promise<Suggestion | undefined> {
  const next = suggestionPatchSchema.parse(patch);
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (next.messageIds) row.message_ids = next.messageIds;
  if (next.configChanges) row.config_changes = next.configChanges;
  if (next.status) row.status = next.status;

  const { data, error } = await ai()
    .from("suggestions")
    .update(row)
    .eq("id", id)
    .eq("status", "pending")
    .select(columns)
    .maybeSingle();
  throwIfError(error);
  if (!data) return undefined;
  return toSuggestion(data as SuggestionRow);
}
