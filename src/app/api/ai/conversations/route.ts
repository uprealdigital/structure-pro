import { assertInternal } from "@/src/common/utils/internal-call";
import { openConversation, removeConversation } from "@/src/features/crm/server/actions";
import { demoChatId, ensureTelegramWebhook, sendTelegramMessage } from "@/src/common/lib/telegram/telegram.service";
import { sendSms } from "@/src/common/lib/twilio/twilio.service";

export const runtime = "nodejs";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const denied = assertInternal(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const phone = text(payload.phone);
  const openingMessage = text(payload.openingMessage);
  const crmDealId = text(payload.crmDealId);
  const cpqQuoteId = text(payload.cpqQuoteId);
  const channel = payload.channel === "telegram" ? "telegram" : "twilio";
  if (!phone || !openingMessage || !crmDealId || !cpqQuoteId) {
    return Response.json({ error: "phone, openingMessage, crmDealId, and cpqQuoteId are required" }, { status: 400 });
  }

  let chatId: string | undefined;
  try {
    chatId = channel === "telegram" ? demoChatId() : undefined;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start conversation";
    return Response.json({ error: message }, { status: 502 });
  }

  const lookupKey = chatId ?? phone;
  try {
    await openConversation({
      lookupKey,
      chatId,
      crmDealId,
      cpqQuoteId,
      contractSent: false,
      messages: [{ role: "model", text: openingMessage }],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save conversation";
    return Response.json({ error: message }, { status: 500 });
  }

  try {
    if (chatId) {
      await ensureTelegramWebhook();
      await sendTelegramMessage(chatId, openingMessage);
    } else {
      await sendSms(phone, openingMessage);
    }
  } catch (error) {
    await removeConversation(lookupKey).catch(() => undefined);
    const message = error instanceof Error ? error.message : "Could not send message";
    return Response.json({ error: message }, { status: 502 });
  }

  return Response.json({ lookupKey, chatId: chatId ?? null });
}

export async function DELETE(request: Request) {
  const denied = assertInternal(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const lookupKey =
    body && typeof body === "object" && typeof (body as { lookupKey?: unknown }).lookupKey === "string"
      ? (body as { lookupKey: string }).lookupKey
      : "";
  if (!lookupKey) return Response.json({ error: "lookupKey is required" }, { status: 400 });

  try {
    await removeConversation(lookupKey);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete conversation";
    return Response.json({ error: message }, { status: 500 });
  }
}
