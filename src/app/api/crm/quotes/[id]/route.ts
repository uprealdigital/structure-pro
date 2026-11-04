import type { RouteContext } from "@/src/common/types";
import { assertInternal } from "@/src/common/utils/internal-call";
import { recordCrmLog } from "@/src/features/crm/common/db/log";
import { getQuote } from "@/src/features/crm/quotes/server/queries";

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext) {
  const denied = assertInternal(request);
  if (denied) return denied;
  const { id } = await context.params;
  if (!id?.trim()) return Response.json({ error: "id is required" }, { status: 400 });
  try {
    const quote = await getQuote(id);
    if (!quote) return Response.json({ error: "Quote not found" }, { status: 404 });
    return Response.json(quote);
  } catch (error) {
    void recordCrmLog({ feature: "quotes", error });
    const message = error instanceof Error ? error.message : "Could not load quote";
    return Response.json({ error: message }, { status: 500 });
  }
}
