import { replyToSms } from "@/src/lib/gemini-sms";
import {
  deleteQuoteSession,
  getQuoteSession,
  saveQuoteSession,
} from "@/src/lib/quote-sessions";
import type { QuoteSession } from "@/src/lib/quote-types";
import {
  emptyTwiml,
  isValidTwilioRequest,
  twimlMessage,
} from "@/src/lib/twilio-sms";

export const runtime = "nodejs";

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
    await deleteQuoteSession(from);
    return xml(
      twimlMessage(
        "You're unsubscribed. Reply START after submitting a new quote if you want to chat again.",
      ),
    );
  }

  let session: QuoteSession | undefined;
  try {
    session = await getQuoteSession(from);
  } catch (error) {
    console.error(error);
    return xml(
      twimlMessage(
        "Sorry, I had trouble loading your quote. Reply again in a moment.",
      ),
    );
  }

  if (!session || session.optedOut) {
    return xml(
      twimlMessage(
        "We don't have an open quote for this number. Submit for quote on the website first.",
      ),
    );
  }

  try {
    const reply = await replyToSms(session, body || "Hi");
    await saveQuoteSession(session);
    return xml(twimlMessage(reply));
  } catch (error) {
    console.error(error);
    return xml(
      twimlMessage(
        "Sorry, I had trouble with that message. Reply again in a moment.",
      ),
    );
  }
}
