import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import { crmLogWriteSchema, type CrmLog, type FeatureLogStatus } from "@/src/features/crm/common/types";
import { toCrmLog, type CrmLogRow } from "@/src/features/crm/common/utils/mappers";

const columns = "id, feature, raw_response, parsed_response, status, error_message, read_at, created_at";

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
  const draft = crmLogWriteSchema.safeParse({
    feature: input.feature,
    rawResponse: input.rawResponse ?? null,
    parsedResponse: input.parsedResponse ?? null,
    status: input.status ?? "error",
    errorMessage: messageOf(input.error),
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
      error_message: draft.data.errorMessage,
    });
    throwIfError(error);
  } catch (error) {
    console.error(error);
  }
}

export async function readCrmLogs(
  limit: number,
  statuses: FeatureLogStatus[],
): Promise<{ logs: CrmLog[]; unreadCount: number }> {
  if (statuses.length === 0) return { logs: [], unreadCount: 0 };
  const unread = crm().from("logs").select("id", { count: "exact", head: true }).is("read_at", null).in("status", statuses);
  const [listed, counted] = await Promise.all([
    crm()
      .from("logs")
      .select(columns)
      .is("read_at", null)
      .in("status", statuses)
      .order("created_at", { ascending: false })
      .limit(limit),
    unread,
  ]);
  throwIfError(listed.error);
  throwIfError(counted.error);
  const rows = Array.isArray(listed.data) ? listed.data : [];
  return {
    logs: rows.flatMap((row) => {
      const log = toCrmLog(row as CrmLogRow);
      return log ? [log] : [];
    }),
    unreadCount: counted.count ?? 0,
  };
}

export async function updateCrmLogsRead(statuses: FeatureLogStatus[]): Promise<void> {
  if (statuses.length === 0) return;
  const { error } = await crm().from("logs").update({ read_at: new Date().toISOString() }).is("read_at", null).in("status", statuses);
  throwIfError(error);
}
