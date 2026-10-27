import { isValidTelegramWebhook, type TelegramUpdate } from "@/src/common/lib/telegram/telegram.service";
import { recordInboundActivity } from "@/src/features/ai/services/inbound-activities.service";

export const runtime = "nodejs";

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
  if (chatId == null) return Response.json({ ok: true });

  await recordInboundActivity({
    channel: "telegram",
    channelKey: String(chatId),
    text: update.message?.text ?? "",
  });

  return Response.json({ ok: true });
}
