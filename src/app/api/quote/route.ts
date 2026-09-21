import { openingSms, isQuoteSelections } from "@/src/lib/selections";
import { toE164 } from "@/src/lib/phone";
import { quoteChannel } from "@/src/lib/quote-channel";
import { saveQuoteSession } from "@/src/lib/quote-sessions";
import {
  demoChatId,
  ensureTelegramWebhook,
  sendTelegramMessage,
} from "@/src/lib/telegram";
import { sendSms } from "@/src/lib/twilio-sms";

function newInvoiceId(): string {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `INV-${stamp}${rand}`;
}

export const runtime = "nodejs";

export async function POST(request: Request) {
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
  const fullName =
    typeof payload.fullName === "string" ? payload.fullName.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const phoneRaw = typeof payload.phone === "string" ? payload.phone : "";
  const phone = toE164(phoneRaw);

  if (!fullName || !email || !phone || !isQuoteSelections(payload.selections)) {
    return Response.json(
      { error: "fullName, phone, email, and selections are required" },
      { status: 400 },
    );
  }

  const invoiceId = newInvoiceId();
  const firstMessage = openingSms(fullName, payload.selections);
  const channel = quoteChannel();
  let chatId: string | undefined;

  try {
    if (channel === "telegram") {
      chatId = demoChatId();
      await ensureTelegramWebhook();
      await sendTelegramMessage(chatId, firstMessage);
    } else {
      await sendSms(phone, firstMessage);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : `Could not send ${channel} message`;
    const startedHint =
      channel === "telegram" &&
      /bot was blocked|chat not found|Forbidden/i.test(message)
        ? " Open the Telegram bot and tap Start, then submit again."
        : "";
    return Response.json({ error: `${message}.${startedHint}` }, { status: 502 });
  }

  saveQuoteSession({
    fullName,
    phone,
    email,
    chatId,
    selections: payload.selections,
    invoiceId,
    messages: [{ role: "model", text: firstMessage }],
    contractSent: false,
    optedOut: false,
  });

  return Response.json({ ok: true, invoiceId, channel });
}
