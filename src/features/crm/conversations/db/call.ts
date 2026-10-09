import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import {
  callDirectionSchema,
  callDraftSchema,
  type Call,
  type CallDirection,
  type CallDraft,
} from "@/src/features/crm/conversations/types";
import { toCall, type CallRow } from "@/src/features/crm/conversations/utils/mappers";

function crm() {
  return db("crm");
}

const callColumns =
  "id, direction, duration_seconds, script_match, recording_url, transcript, external_id, started_at, ended_at";

export async function createCall(input: CallDraft & { direction: CallDirection }): Promise<Call> {
  const direction = callDirectionSchema.parse(input.direction);
  const draft = callDraftSchema.parse(input);
  const { data, error } = await crm()
    .from("calls")
    .insert({
      direction,
      duration_seconds: draft.durationSeconds ?? null,
      script_match: draft.scriptMatch ?? null,
      recording_url: draft.recordingUrl ?? null,
      transcript: draft.transcript ?? null,
      external_id: draft.externalId ?? null,
      started_at: draft.startedAt ?? null,
      ended_at: draft.endedAt ?? null,
      updated_at: new Date().toISOString(),
    })
    .select(callColumns)
    .single();

  throwIfError(error);
  const saved = data ? toCall(data as CallRow) : undefined;
  if (!saved) throw new Error("Call was not saved");
  return saved;
}

export async function readCall(id: string): Promise<Call | undefined> {
  const { data, error } = await crm().from("calls").select(callColumns).eq("id", id).maybeSingle();
  throwIfError(error);
  if (!data) return undefined;
  return toCall(data as CallRow);
}

export async function readCalls(ids: string[]): Promise<Call[]> {
  if (ids.length === 0) return [];
  const { data, error } = await crm().from("calls").select(callColumns).in("id", ids);
  throwIfError(error);
  return ((data ?? []) as CallRow[]).map(toCall).filter((call): call is Call => call != null);
}

export async function updateCall(id: string, patch: CallDraft): Promise<void> {
  const next = callDraftSchema.parse(patch);
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (next.durationSeconds !== undefined) row.duration_seconds = next.durationSeconds;
  if (next.scriptMatch !== undefined) row.script_match = next.scriptMatch;
  if (next.recordingUrl !== undefined) row.recording_url = next.recordingUrl;
  if (next.transcript !== undefined) row.transcript = next.transcript;
  if (next.externalId !== undefined) row.external_id = next.externalId;
  if (next.startedAt !== undefined) row.started_at = next.startedAt;
  if (next.endedAt !== undefined) row.ended_at = next.endedAt;
  const { error } = await crm().from("calls").update(row).eq("id", id);
  throwIfError(error);
}

export async function deleteCall(id: string): Promise<void> {
  const { error } = await crm().from("calls").delete().eq("id", id);
  throwIfError(error);
}
