import { assertInternal } from "@/src/common/utils/internal-call";
import {
  openConversation,
  removeConversation,
  removeLatestActivity,
} from "@/src/features/crm/conversations/server/actions";
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
  const customerId = text(payload.customerId);
  const channel = payload.channel === "telegram" ? "telegram" : "twilio";
  if (!phone || !openingMessage || !customerId) {
    return Response.json(
      { error: "phone, openingMessage, and customerId are required" },
      { status: 400 },
    );
  }

  let chatId: string | undefined;
  try {
    chatId = channel === "telegram" ? demoChatId() : undefined;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start conversation";
    return Response.json({ error: message }, { status: 502 });
  }

  const channelKey = chatId ?? phone;
  const openingActivity = {
    role: "model" as const,
    text: openingMessage,
    channel: channel === "telegram" ? ("telegram" as const) : ("sms" as const),
    generatedBy: "ai" as const,
  };

  let opened: { id: string; created: boolean };
  try {
    opened = await openConversation({
      lookupKey: channelKey,
      channelKey,
      chatId,
      customerId,
      contractSent: false,
      activities: [openingActivity],
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
    if (opened.created) await removeConversation(channelKey).catch(() => undefined);
    else await removeLatestActivity(opened.id).catch(() => undefined);
    const message = error instanceof Error ? error.message : "Could not send message";
    return Response.json({ error: message }, { status: 502 });
  }

  return Response.json({
    lookupKey: channelKey,
    conversationId: opened.id,
    chatId: chatId ?? null,
    created: opened.created,
  });
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
  const conversationId =
    body && typeof body === "object" && typeof (body as { conversationId?: unknown }).conversationId === "string"
      ? (body as { conversationId: string }).conversationId
      : "";
  const latestActivity =
    body && typeof body === "object" && (body as { latestActivity?: unknown }).latestActivity === true;
  if (latestActivity) {
    if (!conversationId) return Response.json({ error: "conversationId is required" }, { status: 400 });
    try {
      await removeLatestActivity(conversationId);
      return Response.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not delete activity";
      return Response.json({ error: message }, { status: 500 });
    }
  }
  if (!lookupKey) return Response.json({ error: "lookupKey is required" }, { status: 400 });

  try {
    await removeConversation(lookupKey);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete conversation";
    return Response.json({ error: message }, { status: 500 });
  }
}
