import { emptyTwiml, isValidTwilioRequest } from "@/src/common/lib/twilio/twilio.service";
import { recordAiIssue } from "@/src/features/ai/services/activity-log.service";
import { recordInboundActivity } from "@/src/features/ai/services/inbound-activities.service";

export const runtime = "nodejs";

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
  if (!from) return xml(emptyTwiml());

  try {
    await recordInboundActivity({
      channel: "sms",
      channelKey: from,
      text: params.Body ?? "",
    });
  } catch (error) {
    void recordAiIssue("sms", error);
  }

  return xml(emptyTwiml());
}
