import type { RouteContext } from "@/src/common/types";
import { assertInternal } from "@/src/common/utils/internal-call";
import { deleteConversation, updateConversation } from "@/src/features/crm/conversations/db/conversation";
import { getConversation } from "@/src/features/crm/conversations/server/queries";

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
  const { key } = await context.params;
  if (!key) return Response.json({ error: "key is required" }, { status: 400 });

  try {
    const conversation = await getConversation(key);
    if (!conversation) return Response.json({ error: "Conversation not found" }, { status: 404 });
    return Response.json(conversation);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load conversation";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const denied = assertInternal(request);
  if (denied) return denied;
  const { key } = await context.params;
  const payload = await payloadOf(request);
  const contractSent = typeof payload?.contractSent === "boolean" ? payload.contractSent : undefined;
  if (!key || contractSent === undefined) {
    return Response.json({ error: "contractSent is required" }, { status: 400 });
  }

  try {
    await updateConversation(key, { contractSent });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update conversation";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const denied = assertInternal(request);
  if (denied) return denied;
  const { key } = await context.params;
  if (!key) return Response.json({ error: "key is required" }, { status: 400 });

  try {
    await deleteConversation(key);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete conversation";
    return Response.json({ error: message }, { status: 500 });
  }
}
