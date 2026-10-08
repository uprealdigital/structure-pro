import { assertInternal } from "@/src/common/utils/internal-call";
import { createConversation } from "@/src/features/crm/db/conversation";
import type { ChatMessage } from "@/src/features/crm/types";

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

export async function POST(request: Request) {
  const denied = assertInternal(request);
  if (denied) return denied;

  const payload = await payloadOf(request);
  const lookupKey = text(payload?.lookupKey);
  const chatId = text(payload?.chatId) || undefined;
  const crmDealId = text(payload?.crmDealId);
  const cpqQuoteId = text(payload?.cpqQuoteId);
  const contractSent = payload?.contractSent === true;
  const messages = messagesOf(payload?.messages);
  if (!lookupKey || !crmDealId || !cpqQuoteId || !messages) {
    return Response.json(
      { error: "lookupKey, crmDealId, cpqQuoteId, and messages are required" },
      { status: 400 },
    );
  }

  try {
    const id = await createConversation({
      lookupKey,
      chatId,
      crmDealId,
      cpqQuoteId,
      contractSent,
      messages,
    });
    return Response.json({ id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save conversation";
    return Response.json({ error: message }, { status: 500 });
  }
}
