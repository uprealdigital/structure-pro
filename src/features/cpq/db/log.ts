import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import { cpqLogWriteSchema, type CpqLog, type CpqLogWrite } from "@/src/features/cpq/types";
import { toCpqLog, type CpqLogRow } from "@/src/features/cpq/utils/mappers";

const columns = "id, feature, raw_response, parsed_response, status, error_message, created_at";

function cpq() {
  return db("cpq");
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

export async function recordCpqLog(input: {
  feature: string;
  error?: unknown;
  status?: CpqLogWrite["status"];
  rawResponse?: string | null;
  parsedResponse?: unknown;
}): Promise<void> {
  const draft = cpqLogWriteSchema.safeParse({
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
    const { error } = await cpq().from("logs").insert({
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

export async function readCpqLogs(limit: number): Promise<{ logs: CpqLog[]; errorCount: number }> {
  const [listed, errors] = await Promise.all([
    cpq().from("logs").select(columns).order("created_at", { ascending: false }).limit(limit),
    cpq().from("logs").select("id", { count: "exact", head: true }).eq("status", "error"),
  ]);
  throwIfError(listed.error);
  throwIfError(errors.error);
  const rows = Array.isArray(listed.data) ? listed.data : [];
  return {
    logs: rows.flatMap((row) => {
      const log = toCpqLog(row as CpqLogRow);
      return log ? [log] : [];
    }),
    errorCount: errors.count ?? 0,
  };
}
