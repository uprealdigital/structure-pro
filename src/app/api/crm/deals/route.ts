import { assertInternal } from "@/src/common/utils/internal-call";
import type { DealSource } from "@/src/features/crm/types";
import { createDeal } from "@/src/features/crm/db/deal";

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
  const contactId = text(payload?.contactId);
  const cpqQuoteId = text(payload?.cpqQuoteId);
  const source = sourceOf(payload?.source);
  if (!contactId || !cpqQuoteId || !source) {
    return Response.json(
      { error: "contactId, cpqQuoteId, and source are required" },
      { status: 400 },
    );
  }
  try {
    const deal = await createDeal({ contactId, cpqQuoteId, source });
    return Response.json(deal);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save deal";
    return Response.json({ error: message }, { status: 500 });
  }
}
