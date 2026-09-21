import twilio from "twilio";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

export function getTwilioClient() {
  return twilio(
    requireEnv("TWILIO_ACCOUNT_SID"),
    requireEnv("TWILIO_AUTH_TOKEN"),
  );
}

export async function sendSms(to: string, body: string): Promise<void> {
  const client = getTwilioClient();
  const chunks = splitSms(body);
  for (const chunk of chunks) {
    await client.messages.create({
      to,
      from: requireEnv("TWILIO_PHONE_NUMBER"),
      body: chunk,
    });
  }
}

export function splitSms(body: string, max = 1500): string[] {
  const text = body.trim();
  if (!text) return [""];
  if (text.length <= max) return [text];

  const parts: string[] = [];
  let remaining = text;
  while (remaining.length > max) {
    let cut = remaining.lastIndexOf(" ", max);
    if (cut < 1) cut = max;
    parts.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) parts.push(remaining);
  return parts;
}

export function twimlMessage(body: string): string {
  const response = new twilio.twiml.MessagingResponse();
  const chunks = splitSms(body);
  for (const chunk of chunks) {
    if (chunk) response.message(chunk);
  }
  return response.toString();
}

export function emptyTwiml(): string {
  return new twilio.twiml.MessagingResponse().toString();
}

export function webhookUrlFromRequest(request: Request): string {
  const configured = process.env.TWILIO_WEBHOOK_URL;
  if (configured) return configured;

  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}/api/twilio/sms`;
}

export function isValidTwilioRequest(
  request: Request,
  params: Record<string, string>,
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = request.headers.get("x-twilio-signature");
  if (!authToken || !signature) return false;

  return twilio.validateRequest(
    authToken,
    signature,
    webhookUrlFromRequest(request),
    params,
  );
}
