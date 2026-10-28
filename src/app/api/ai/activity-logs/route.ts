import { z } from "zod";
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

async function section(
  kind: SectionKind,
  read: (limit: number, statuses: AiActivityStatus[]) => Promise<{ logs: unknown[]; unreadCount: number }>,
  statuses: AiActivityStatus[],
) {
  try {
    const data = await read(40, statuses);
    return { kind, logs: data.logs, unreadCount: data.unreadCount, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load logs";
    return { kind, logs: [], unreadCount: 0, error: message };
  }
}

function unavailable() {
  return Response.json({ error: "Not found" }, { status: 404 });
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") return unavailable();
  const statuses = statusesFrom(new URL(request.url).searchParams.get("statuses"));
  const sections = await Promise.all([
    section("ai", readActivityLogs, statuses),
    section("crm", readCrmLogs, statuses),
    section("cpq", readCpqLogs, statuses),
  ]);
  return Response.json({ sections });
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return unavailable();
  const parsed = clearLogsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Unknown log category" }, { status: 400 });
  const { kind, statuses } = parsed.data;
  try {
    await Promise.all([
      kind === "all" || kind === "ai" ? updateActivityLogsRead(statuses) : Promise.resolve(),
      kind === "all" || kind === "crm" ? updateCrmLogsRead(statuses) : Promise.resolve(),
      kind === "all" || kind === "cpq" ? updateCpqLogsRead(statuses) : Promise.resolve(),
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not clear logs";
    return Response.json({ error: message }, { status: 500 });
  }
}
