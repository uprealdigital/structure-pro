import { recordCrmLog } from "@/src/features/crm/common/db/log";
import { getNavCounts } from "@/src/features/crm/common/server/queries";

export const runtime = "nodejs";

export async function GET() {
  try {
    const counts = await getNavCounts();
    return Response.json(counts);
  } catch (error) {
    void recordCrmLog({ feature: "navigation", error });
    const message = error instanceof Error ? error.message : "Could not load navigation";
    return Response.json({ error: message }, { status: 500 });
  }
}
