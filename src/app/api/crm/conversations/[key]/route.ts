import type { RouteContext } from "@/src/common/types";
import { assertInternal } from "@/src/common/utils/internal-call";
import { deleteConversation, updateConversation } from "@/src/features/crm/db/conversation";
import { getConversation } from "@/src/features/crm/server/queries";
import type { ChatMessage } from "@/src/features/crm/types";

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

function messagesOf(value: unknown): ChatMessage[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const messages: ChatMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return undefined;
    const role = (item as { role?: unknown }).role;
    const textValue = (item as { text?: unknown }).text;
    if ((role !== "user" && role !== "model") || typeof textValue !== "string") return undefined;
    messages.push({ role, text: textValue });
  }
  return messages;
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
  const messages = payload?.messages === undefined ? undefined : messagesOf(payload.messages);
  if (!key || (contractSent === undefined && !messages)) {
    return Response.json({ error: "contractSent or messages is required" }, { status: 400 });
  }
  if (payload?.messages !== undefined && !messages) {
    return Response.json({ error: "messages are invalid" }, { status: 400 });
  }

  try {
    await updateConversation(key, { contractSent, messages });
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
