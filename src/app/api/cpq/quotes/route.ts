import { assertInternal } from "@/src/common/utils/internal-call";
import { createQuote } from "@/src/features/cpq/db/quote";
import { getQuoteForPage } from "@/src/features/cpq/server/queries";
import { quoteSelectionsSchema } from "@/src/features/cpq/types";
import { newInvoiceId } from "@/src/features/cpq/utils/id";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = assertInternal(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const selections =
    body && typeof body === "object" ? (body as { selections?: unknown }).selections : undefined;
  const parsed = quoteSelectionsSchema.safeParse(selections);
  if (!parsed.success) {
    return Response.json({ error: "selections are required" }, { status: 400 });
  }

  try {
    const invoiceId = newInvoiceId();
    const id = await createQuote({ invoiceId, selections: parsed.data });
    const quote = await getQuoteForPage(id);
    if (!quote) return Response.json({ error: "Quote was not saved" }, { status: 500 });
    return Response.json(quote);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save quote";
    return Response.json({ error: message }, { status: 500 });
  }
}
