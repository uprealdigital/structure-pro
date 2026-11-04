import { recordCrmLog } from "@/src/features/crm/common/db/log";
import { getQuoteDirectory } from "@/src/features/crm/quotes/server/queries";

export const runtime = "nodejs";

export async function GET() {
  try {
    const quotes = await getQuoteDirectory();
    return Response.json({ quotes });
  } catch (error) {
    void recordCrmLog({ feature: "quotes", error });
    const message = error instanceof Error ? error.message : "Could not load quotes";
    return Response.json({ error: message }, { status: 500 });
  }
}
