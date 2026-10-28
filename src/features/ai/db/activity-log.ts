import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import { emptyLogLevelCounts, type LogLevel, type LogLevelCounts } from "@/src/common/utils/log-level";
import type { AiActivityLog, AiActivityLogWrite, AiActivityStatus } from "@/src/features/ai/types";
import { toAiActivityLog, type AiActivityLogRow } from "@/src/features/ai/utils/mappers";

const columns =
  "id, deal_id, activity_ids, feature, prompt_payload, model, raw_response, parsed_response, status, log_level, error_message, execution_time_ms, read_at, created_at";

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
    log_level: input.logLevel,
    error_message: input.errorMessage,
    execution_time_ms: input.executionTimeMs,
  });
  throwIfError(error);
}

async function unreadByLevel(statuses: AiActivityStatus[], levels: LogLevel[]): Promise<LogLevelCounts> {
  const counts = emptyLogLevelCounts();
  await Promise.all(
    levels.map(async (level) => {
      const result = await ai()
        .from("logs")
        .select("id", { count: "exact", head: true })
        .is("read_at", null)
        .in("status", statuses)
        .eq("log_level", level);
      if (!result.error) {
        counts[level] = result.count ?? 0;
        return;
      }
      if (result.error.message?.trim()) throwIfError(result.error);
      const probe = await ai()
        .from("logs")
        .select("id")
        .limit(1)
        .is("read_at", null)
        .in("status", statuses)
        .eq("log_level", level);
      throwIfError(probe.error ?? result.error);
    }),
  );
  return counts;
}

export async function readActivityLogs(
  limit: number,
  statuses: AiActivityStatus[],
  levels: LogLevel[],
): Promise<{ logs: AiActivityLog[]; unreadCount: number; unreadByLevel: LogLevelCounts }> {
  if (statuses.length === 0 || levels.length === 0) {
    return { logs: [], unreadCount: 0, unreadByLevel: emptyLogLevelCounts() };
  }
  const [listed, counts] = await Promise.all([
    ai()
      .from("logs")
      .select(columns)
      .is("read_at", null)
      .in("status", statuses)
      .in("log_level", levels)
      .order("created_at", { ascending: false })
      .limit(limit),
    unreadByLevel(statuses, levels),
  ]);
  throwIfError(listed.error);
  const rows = Array.isArray(listed.data) ? listed.data : [];
  return {
    logs: rows.flatMap((row) => {
      const log = toAiActivityLog(row as AiActivityLogRow);
      return log ? [log] : [];
    }),
    unreadCount: levels.reduce((sum, level) => sum + counts[level], 0),
    unreadByLevel: counts,
  };
}

export async function updateActivityLogsRead(statuses: AiActivityStatus[], levels: LogLevel[]): Promise<void> {
  if (statuses.length === 0 || levels.length === 0) return;
  const { error } = await ai()
    .from("logs")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null)
    .in("status", statuses)
    .in("log_level", levels);
  throwIfError(error);
}
