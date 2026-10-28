import { readActivityLogs } from "@/src/features/ai/db/activity-log";
import { readCpqLogs } from "@/src/features/cpq/db/log";
import { readCrmLogs } from "@/src/features/crm/common/db/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SectionKind = "ai" | "crm" | "cpq";

async function section(
  kind: SectionKind,
  read: (limit: number) => Promise<{ logs: unknown[]; errorCount: number }>,
) {
  try {
    const data = await read(40);
    return { kind, logs: data.logs, errorCount: data.errorCount, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load logs";
    return { kind, logs: [], errorCount: 0, error: message };
  }
}

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const sections = await Promise.all([
    section("ai", readActivityLogs),
    section("crm", readCrmLogs),
    section("cpq", readCpqLogs),
  ]);
  return Response.json({ sections });
}
