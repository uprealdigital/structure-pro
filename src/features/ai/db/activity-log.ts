import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import type { AiActivityLog, AiActivityLogWrite } from "@/src/features/ai/types";
import { toAiActivityLog, type AiActivityLogRow } from "@/src/features/ai/utils/mappers";

const columns =
  "id, deal_id, activity_ids, feature, prompt_payload, model, raw_response, parsed_response, status, error_message, execution_time_ms, created_at";

function ai() {
  return db("ai");
}

function jsonValue(value: unknown): unknown {
  if (value == null) return null;
  try {
    return JSON.parse(JSON.stringify(value)) as unknown;
  } catch {
    return { unserializable: true };
  }
}

export async function createActivityLog(input: AiActivityLogWrite): Promise<void> {
  const { error } = await ai().from("logs").insert({
    deal_id: input.dealId,
    activity_ids: input.activityIds,
    feature: input.feature,
    prompt_payload: jsonValue(input.promptPayload) ?? {},
    model: input.model,
    raw_response: input.rawResponse,
    parsed_response: jsonValue(input.parsedResponse),
    status: input.status,
    error_message: input.errorMessage,
    execution_time_ms: input.executionTimeMs,
  });
  throwIfError(error);
}

export async function readActivityLogs(limit: number): Promise<{ logs: AiActivityLog[]; errorCount: number }> {
  const [listed, errors] = await Promise.all([
    ai().from("logs").select(columns).order("created_at", { ascending: false }).limit(limit),
    ai().from("logs").select("id", { count: "exact", head: true }).eq("status", "error"),
  ]);
  throwIfError(listed.error);
  throwIfError(errors.error);
  const rows = Array.isArray(listed.data) ? listed.data : [];
  return {
    logs: rows.flatMap((row) => {
      const log = toAiActivityLog(row as AiActivityLogRow);
      return log ? [log] : [];
    }),
    errorCount: errors.count ?? 0,
  };
}
