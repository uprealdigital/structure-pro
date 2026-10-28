import { assertInternal } from "@/src/common/utils/internal-call";
import { recordCrmLog } from "@/src/features/crm/common/db/log";
import { createDeal } from "@/src/features/crm/deals/db/deal";
import { createDealQuote } from "@/src/features/crm/deals/db/deal-quote";
import type { DealSource } from "@/src/features/crm/deals/types";

export const runtime = "nodejs";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function payloadOf(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

function sourceOf(value: unknown): DealSource | undefined {
  if (value === "quote" || value === "yard_preview") return value;
  return undefined;
}

export async function POST(request: Request) {
  const denied = assertInternal(request);
  if (denied) return denied;
  const payload = await payloadOf(request);
  const quoteId = text(payload?.quoteId);
  const source = sourceOf(payload?.source);
  if (!quoteId || !source) {
    return Response.json({ error: "quoteId and source are required" }, { status: 400 });
  }
  try {
    const deal = await createDeal({ quoteId, source });
    try {
      await createDealQuote({ dealId: deal.id, quoteId: deal.quoteId });
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      const missing =
        message.includes("permission denied") ||
        message.includes("42501") ||
        (message.includes("deal_quotes") &&
          (message.includes("does not exist") ||
            message.includes("schema cache") ||
            message.includes("could not find")));
      if (!missing) throw error;
    }
    return Response.json(deal);
  } catch (error) {
    void recordCrmLog({ feature: "deals", error });
    const message = error instanceof Error ? error.message : "Could not save deal";
    return Response.json({ error: message }, { status: 500 });
  }
}
