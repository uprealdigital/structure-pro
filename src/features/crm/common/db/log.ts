import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import { emptyLogLevelCounts, logLevelFor, type LogLevel, type LogLevelCounts } from "@/src/common/utils/log-level";
import { crmLogWriteSchema, type CrmLog, type FeatureLogStatus } from "@/src/features/crm/common/types";
import { toCrmLog, type CrmLogRow } from "@/src/features/crm/common/utils/mappers";

const columns = "id, feature, raw_response, parsed_response, status, log_level, error_message, read_at, created_at";

function crm() {
  return db("crm");
}

function jsonValue(value: unknown): unknown {
  if (value == null) return null;
  try {
    return JSON.parse(JSON.stringify(value)) as unknown;
  } catch {
    return { unserializable: true };
  }
}

function messageOf(error: unknown): string | null {
  if (error == null) return null;
  return error instanceof Error ? error.message : String(error);
}

export async function recordCrmLog(input: {
  feature: string;
  error?: unknown;
  status?: FeatureLogStatus;
  rawResponse?: string | null;
  parsedResponse?: unknown;
}): Promise<void> {
  const status = input.status ?? "error";
  const errorMessage = messageOf(input.error);
  const draft = crmLogWriteSchema.safeParse({
    feature: input.feature,
    rawResponse: input.rawResponse ?? null,
    parsedResponse: input.parsedResponse ?? null,
    status,
    logLevel: logLevelFor(status, errorMessage),
    errorMessage,
  });
  if (!draft.success) {
    console.error(draft.error);
    return;
  }
  try {
    const { error } = await crm().from("logs").insert({
      feature: draft.data.feature,
      raw_response: draft.data.rawResponse,
      parsed_response: jsonValue(draft.data.parsedResponse),
      status: draft.data.status,
      log_level: draft.data.logLevel,
      error_message: draft.data.errorMessage,
    });
    throwIfError(error);
  } catch (error) {
    console.error(error);
  }
}

async function unreadByLevel(statuses: FeatureLogStatus[], levels: LogLevel[]): Promise<LogLevelCounts> {
  const counts = emptyLogLevelCounts();
  await Promise.all(
    levels.map(async (level) => {
      const result = await crm()
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
      const probe = await crm()
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

export async function readCrmLogs(
  limit: number,
  statuses: FeatureLogStatus[],
  levels: LogLevel[],
): Promise<{ logs: CrmLog[]; unreadCount: number; unreadByLevel: LogLevelCounts }> {
  if (statuses.length === 0 || levels.length === 0) {
    return { logs: [], unreadCount: 0, unreadByLevel: emptyLogLevelCounts() };
  }
  const [listed, counts] = await Promise.all([
    crm()
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
      const log = toCrmLog(row as CrmLogRow);
      return log ? [log] : [];
    }),
    unreadCount: levels.reduce((sum, level) => sum + counts[level], 0),
    unreadByLevel: counts,
  };
}

export async function updateCrmLogsRead(statuses: FeatureLogStatus[], levels: LogLevel[]): Promise<void> {
  if (statuses.length === 0 || levels.length === 0) return;
  const { error } = await crm()
    .from("logs")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null)
    .in("status", statuses)
    .in("log_level", levels);
  throwIfError(error);
}
