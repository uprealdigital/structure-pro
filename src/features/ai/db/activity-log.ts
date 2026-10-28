import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import type { AiActivityLog, AiActivityLogWrite, AiActivityStatus } from "@/src/features/ai/types";
import { toAiActivityLog, type AiActivityLogRow } from "@/src/features/ai/utils/mappers";

const columns =
  "id, deal_id, activity_ids, feature, prompt_payload, model, raw_response, parsed_response, status, error_message, execution_time_ms, read_at, created_at";

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

export async function readActivityLogs(
  limit: number,
  statuses: AiActivityStatus[],
): Promise<{ logs: AiActivityLog[]; unreadCount: number }> {
  if (statuses.length === 0) return { logs: [], unreadCount: 0 };
  const [listed, counted] = await Promise.all([
    ai()
      .from("logs")
      .select(columns)
      .is("read_at", null)
      .in("status", statuses)
      .order("created_at", { ascending: false })
      .limit(limit),
    ai().from("logs").select("id", { count: "exact", head: true }).is("read_at", null).in("status", statuses),
  ]);
  throwIfError(listed.error);
  throwIfError(counted.error);
  const rows = Array.isArray(listed.data) ? listed.data : [];
  return {
    logs: rows.flatMap((row) => {
      const log = toAiActivityLog(row as AiActivityLogRow);
      return log ? [log] : [];
    }),
    unreadCount: counted.count ?? 0,
  };
}

export async function updateActivityLogsRead(statuses: AiActivityStatus[]): Promise<void> {
  if (statuses.length === 0) return;
  const { error } = await ai().from("logs").update({ read_at: new Date().toISOString() }).is("read_at", null).in("status", statuses);
  throwIfError(error);
}
