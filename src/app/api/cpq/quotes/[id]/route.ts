import { assertInternal } from "@/src/common/utils/internal-call";
import type { RouteContext } from "@/src/common/types";
import { deleteQuote } from "@/src/features/crm/quotes/db/quote";
import { getQuoteForPage } from "@/src/features/cpq/server/queries";

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext) {
  const denied = assertInternal(request);
  if (denied) return denied;
  const { id } = await context.params;
  try {
    const quote = await getQuoteForPage(id);
    if (!quote) return Response.json({ error: "Quote not found" }, { status: 404 });
    return Response.json(quote);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load quote";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const denied = assertInternal(request);
  if (denied) return denied;
  const { id } = await context.params;
  try {
    await deleteQuote(id);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete quote";
    return Response.json({ error: message }, { status: 500 });
  }
}
