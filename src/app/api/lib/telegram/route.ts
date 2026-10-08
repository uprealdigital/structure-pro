import { after } from "next/server";
import {
  loadAgentSession,
  optOutContact,
  removeConversation,
  saveAgentSession,
} from "@/src/features/ai/services/conversation.service";
import { replyFailureMessage, replyToSms } from "@/src/features/ai/services/tool-calling.service";
import {
  isValidTelegramWebhook,
  sendTelegramMessage,
  type TelegramUpdate,
} from "@/src/common/lib/telegram/telegram.service";

export const runtime = "nodejs";
export const maxDuration = 120;

const STOP_RE = /^(stop|stopall|unsubscribe|cancel|end|quit)$/i;

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
  if (chatId == null) {
    return Response.json({ ok: true });
  }

  const key = String(chatId);

  if (text === "/start") {
    await sendTelegramMessage(
      key,
      "This bot is ready. Submit for quote on the website, then reply here.",
    );
    return Response.json({ ok: true });
  }

  if (STOP_RE.test(text)) {
    await optOutContact(key).catch((error) => console.error(error));
    await removeConversation(key);
    await sendTelegramMessage(
      key,
      "You're unsubscribed. Submit a new quote on the website if you want to chat again.",
    );
    return Response.json({ ok: true });
  }

  let loaded: Awaited<ReturnType<typeof loadAgentSession>>;
  try {
    loaded = await loadAgentSession(key);
  } catch (error) {
    console.error(error);
    await sendTelegramMessage(
      key,
      "Sorry, I had trouble loading your quote. Reply again in a moment.",
    );
    return Response.json({ ok: true });
  }

  if (!loaded) {
    await sendTelegramMessage(
      key,
      "We don't have an open quote yet. Submit for quote on the website first.",
    );
    return Response.json({ ok: true });
  }

  const { conversationId, session } = loaded;

  after(async () => {
    try {
      const reply = await replyToSms(session, text || "Hi");
      await sendTelegramMessage(key, reply);
      try {
        await saveAgentSession(conversationId, session);
      } catch (error) {
        console.error(error);
      }
    } catch (error) {
      console.error(error);
      await sendTelegramMessage(key, replyFailureMessage(error)).catch((sendError) => {
        console.error(sendError);
      });
    }
  });

  return Response.json({ ok: true });
}
