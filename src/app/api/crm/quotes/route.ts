import { assertInternal } from "@/src/common/utils/internal-call";
import { recordCrmLog } from "@/src/features/crm/common/db/log";
import { getQuotes } from "@/src/features/crm/quotes/server/queries";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = assertInternal(request);
  if (denied) return denied;
  try {
    const quotes = await getQuotes();
    return Response.json({ quotes });
  } catch (error) {
    void recordCrmLog({ feature: "quotes", error });
    const message = error instanceof Error ? error.message : "Could not load quotes";
    return Response.json({ error: message }, { status: 500 });
  }
}
