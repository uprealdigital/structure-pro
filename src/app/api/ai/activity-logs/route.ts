import { z } from "zod";
import { emptyLogLevelCounts, logLevelSchema, logLevels, type LogLevel, type LogLevelCounts } from "@/src/common/utils/log-level";
import { readActivityLogs, updateActivityLogsRead } from "@/src/features/ai/db/activity-log";
import { aiActivityStatusSchema, type AiActivityStatus } from "@/src/features/ai/types";
import { readCpqLogs, updateCpqLogsRead } from "@/src/features/cpq/db/log";
import { readCrmLogs, updateCrmLogsRead } from "@/src/features/crm/common/db/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SectionKind = "ai" | "crm" | "cpq";

const clearLogsSchema = z.object({
  kind: z.enum(["ai", "crm", "cpq", "all"]),
  statuses: z.array(aiActivityStatusSchema),
  levels: z.array(logLevelSchema),
});

const logStatuses: AiActivityStatus[] = ["error", "detected", "none"];

function statusesFrom(value: string | null): AiActivityStatus[] {
  if (value == null) return ["error"];
  const allowed = new Set(logStatuses);
  const statuses: AiActivityStatus[] = [];
  for (const part of value.split(",")) {
    const status = part.trim() as AiActivityStatus;
    if (!allowed.has(status) || statuses.includes(status)) continue;
    statuses.push(status);
  }
  return statuses;
}

function levelsFrom(value: string | null): LogLevel[] {
  if (value == null) return ["error"];
  const allowed = new Set(logLevels);
  const levels: LogLevel[] = [];
  for (const part of value.split(",")) {
    const level = part.trim() as LogLevel;
    if (!allowed.has(level) || levels.includes(level)) continue;
    levels.push(level);
  }
  return logLevels.filter((level) => levels.includes(level));
}

async function section(
  kind: SectionKind,
  read: (
    limit: number,
    statuses: AiActivityStatus[],
    levels: LogLevel[],
  ) => Promise<{ logs: unknown[]; unreadCount: number; unreadByLevel: LogLevelCounts }>,
  statuses: AiActivityStatus[],
  levels: LogLevel[],
) {
  try {
    const data = await read(40, statuses, levels);
    return { kind, logs: data.logs, unreadCount: data.unreadCount, unreadByLevel: data.unreadByLevel, error: null };
  } catch (error) {
    const message = error instanceof Error && error.message.trim() ? error.message : "Could not load logs";
    return { kind, logs: [], unreadCount: 0, unreadByLevel: emptyLogLevelCounts(), error: message };
  }
}

function unavailable() {
  return Response.json({ error: "Not found" }, { status: 404 });
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") return unavailable();
  const url = new URL(request.url);
  const statuses = statusesFrom(url.searchParams.get("statuses"));
  const levels = levelsFrom(url.searchParams.get("levels"));
  const sections = await Promise.all([
    section("ai", readActivityLogs, statuses, levels),
    section("crm", readCrmLogs, statuses, levels),
    section("cpq", readCpqLogs, statuses, levels),
  ]);
  return Response.json({ sections });
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return unavailable();
  const parsed = clearLogsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Unknown log category" }, { status: 400 });
  const { kind, statuses, levels } = parsed.data;
  try {
    await Promise.all([
      kind === "all" || kind === "ai" ? updateActivityLogsRead(statuses, levels) : Promise.resolve(),
      kind === "all" || kind === "crm" ? updateCrmLogsRead(statuses, levels) : Promise.resolve(),
      kind === "all" || kind === "cpq" ? updateCpqLogsRead(statuses, levels) : Promise.resolve(),
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not clear logs";
    return Response.json({ error: message }, { status: 500 });
  }
}
