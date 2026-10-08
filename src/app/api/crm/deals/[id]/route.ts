import type { RouteContext } from "@/src/common/types";
import { assertInternal } from "@/src/common/utils/internal-call";
import type { DealStatus } from "@/src/features/crm/types";
import { deleteDeal, updateDeal } from "@/src/features/crm/db/deal";
import { getDeal } from "@/src/features/crm/server/queries";

export const runtime = "nodejs";

async function payloadOf(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

function statusOf(value: unknown): DealStatus | undefined {
  if (value === "open" || value === "invoice_sent") return value;
  return undefined;
}

export async function GET(request: Request, context: RouteContext) {
  const denied = assertInternal(request);
  if (denied) return denied;
  const { id } = await context.params;
  try {
    const deal = await getDeal(id);
    if (!deal) return Response.json({ error: "Deal not found" }, { status: 404 });
    return Response.json(deal);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load deal";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const denied = assertInternal(request);
  if (denied) return denied;
  const { id } = await context.params;
  const payload = await payloadOf(request);
  const status = statusOf(payload?.status);
  if (!status) return Response.json({ error: "status is required" }, { status: 400 });
  try {
    await updateDeal(id, { status });
    const deal = await getDeal(id);
    if (!deal) return Response.json({ error: "Deal not found" }, { status: 404 });
    return Response.json(deal);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update deal";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const denied = assertInternal(request);
  if (denied) return denied;
  const { id } = await context.params;
  try {
    await deleteDeal(id);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete deal";
    return Response.json({ error: message }, { status: 500 });
  }
}
