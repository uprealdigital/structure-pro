import {
  isValidTelegramWebhook,
  sendTelegramMessage,
  type TelegramUpdate,
} from "@/src/common/lib/telegram/telegram.service";
import {
  AUTOMATIC_REPLIES_ENABLED,
  processInboundMessage,
} from "@/src/features/ai/services/messaging-agent.service";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  if (!isValidTelegramWebhook(request)) {
    return new Response("Forbidden", { status: 403 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return Response.json({ ok: true });
  }

  const chatId = update.message?.chat?.id;
  const text = update.message?.text?.trim() ?? "";
  if (chatId == null) return Response.json({ ok: true });

  const key = String(chatId);

  if (text === "/start") {
    if (AUTOMATIC_REPLIES_ENABLED) {
      await sendTelegramMessage(
        key,
        "This bot is ready. Submit for quote on the website, then reply here.",
      );
    }
    return Response.json({ ok: true });
  }

  const syncReply = await processInboundMessage({
    channelKey: key,
    channel: "telegram",
    text,
    sendMessage: async (message) => {
      if (!AUTOMATIC_REPLIES_ENABLED || !message.trim()) return;
      await sendTelegramMessage(key, message);
    },
  });

  if (AUTOMATIC_REPLIES_ENABLED && syncReply?.trim()) {
    await sendTelegramMessage(key, syncReply);
  }

  return Response.json({ ok: true });
}
