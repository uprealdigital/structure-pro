import type { RouteContext } from "@/src/common/types";
import { assertInternal } from "@/src/common/utils/internal-call";
import { updateContact } from "@/src/features/crm/db/contact";
import { getContact } from "@/src/features/crm/server/queries";

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

export async function GET(request: Request, context: RouteContext) {
  const denied = assertInternal(request);
  if (denied) return denied;
  const { id } = await context.params;
  try {
    const contact = await getContact(id);
    if (!contact) return Response.json({ error: "Contact not found" }, { status: 404 });
    return Response.json(contact);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load contact";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const denied = assertInternal(request);
  if (denied) return denied;
  const { id } = await context.params;
  const payload = await payloadOf(request);
  if (typeof payload?.optedOut !== "boolean") {
    return Response.json({ error: "optedOut is required" }, { status: 400 });
  }
  try {
    await updateContact(id, { optedOut: payload.optedOut });
    const contact = await getContact(id);
    if (!contact) return Response.json({ error: "Contact not found" }, { status: 404 });
    return Response.json(contact);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update contact";
    return Response.json({ error: message }, { status: 500 });
  }
}
