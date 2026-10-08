import { after } from "next/server";
import {
  loadAgentSession,
  optOutContact,
  removeConversation,
  saveAgentSession,
} from "@/src/features/ai/services/conversation.service";
import { replyFailureMessage, replyToSms } from "@/src/features/ai/services/tool-calling.service";
import {
  emptyTwiml,
  isValidTwilioRequest,
  sendSms,
  twimlMessage,
} from "@/src/common/lib/twilio/twilio.service";

export const runtime = "nodejs";
export const maxDuration = 120;

const STOP_RE = /^(stop|stopall|unsubscribe|cancel|end|quit)$/i;

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

  if (!from) {
    return xml(emptyTwiml());
  }

  if (STOP_RE.test(body)) {
    await optOutContact(from).catch((error) => console.error(error));
    await removeConversation(from);
    return xml(
      twimlMessage(
        "You're unsubscribed. Reply START after submitting a new quote if you want to chat again.",
      ),
    );
  }

  let loaded: Awaited<ReturnType<typeof loadAgentSession>>;
  try {
    loaded = await loadAgentSession(from);
  } catch (error) {
    console.error(error);
    return xml(
      twimlMessage(
        "Sorry, I had trouble loading your quote. Reply again in a moment.",
      ),
    );
  }

  if (!loaded) {
    return xml(
      twimlMessage(
        "We don't have an open quote for this number. Submit for quote on the website first.",
      ),
    );
  }

  const { conversationId, session } = loaded;

  after(async () => {
    try {
      const reply = await replyToSms(session, body || "Hi");
      try {
        await saveAgentSession(conversationId, session);
      } catch (error) {
        console.error(error);
      }
      await sendSms(from, reply);
    } catch (error) {
      console.error(error);
      await sendSms(from, replyFailureMessage(error)).catch((sendError) => {
        console.error(sendError);
      });
    }
  });

  return xml(emptyTwiml());
}
