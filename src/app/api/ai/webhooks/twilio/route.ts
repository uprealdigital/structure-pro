import {
  emptyTwiml,
  isValidTwilioRequest,
  sendSms,
  twimlMessage,
} from "@/src/common/lib/twilio/twilio.service";
import {
  AUTOMATIC_REPLIES_ENABLED,
  processInboundMessage,
} from "@/src/features/ai/services/messaging-agent.service";

export const runtime = "nodejs";
export const maxDuration = 120;

function xml(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

export async function POST(request: Request) {
  const raw = await request.text();
  const params = Object.fromEntries(new URLSearchParams(raw));

  if (!isValidTwilioRequest(request, params)) {
    return new Response("Forbidden", { status: 403 });
  }

  const from = params.From ?? "";
  const body = (params.Body ?? "").trim();
  if (!from) return xml(emptyTwiml());

  const syncReply = await processInboundMessage({
    channelKey: from,
    channel: "sms",
    text: body,
    sendMessage: async (message) => {
      if (!AUTOMATIC_REPLIES_ENABLED || !message.trim()) return;
      await sendSms(from, message);
    },
  });

  if (!AUTOMATIC_REPLIES_ENABLED || !syncReply?.trim()) return xml(emptyTwiml());
  return xml(twimlMessage(syncReply));
}
