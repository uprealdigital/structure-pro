export function botToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN");
  }
  return token;
}

export function demoChatId(): string {
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!chatId) {
    throw new Error("Missing TELEGRAM_CHAT_ID");
  }
  return chatId;
}

function apiUrl(method: string): string {
  return `https://api.telegram.org/bot${botToken()}/${method}`;
}

type TelegramResult<T> = {
  ok: boolean;
  description?: string;
  result?: T;
};

async function telegramCall<T>(
  method: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(apiUrl(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as TelegramResult<T>;
  if (!payload.ok) {
    throw new Error(payload.description || `Telegram ${method} failed`);
  }
  return payload.result as T;
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
): Promise<void> {
  const chunks = splitTelegram(text);
  for (const chunk of chunks) {
    if (!chunk) continue;
    await telegramCall("sendMessage", { chat_id: chatId, text: chunk });
  }
}

export function splitTelegram(body: string, max = 4000): string[] {
  const text = body.trim();
  if (!text) return [""];
  if (text.length <= max) return [text];

  const parts: string[] = [];
  let remaining = text;
  while (remaining.length > max) {
    let cut = remaining.lastIndexOf("\n", max);
    if (cut < 1) cut = remaining.lastIndexOf(" ", max);
    if (cut < 1) cut = max;
    parts.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) parts.push(remaining);
  return parts;
}

export async function ensureTelegramWebhook(): Promise<void> {
  const url = process.env.TELEGRAM_WEBHOOK_URL?.trim();
  if (!url) return;

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const payload: Record<string, unknown> = {
    url,
    allowed_updates: ["message"],
  };
  if (secret) payload.secret_token = secret;
  await telegramCall("setWebhook", payload);
}

export function isValidTelegramWebhook(request: Request): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!secret) return true;
  return request.headers.get("x-telegram-bot-api-secret-token") === secret;
}

export async function persistQuoteSnapshot(encoded: string): Promise<void> {
  await telegramCall("setMyDescription", { description: encoded });
}

export async function loadQuoteSnapshot(): Promise<string | null> {
  try {
    const result = await telegramCall<{ description?: string }>(
      "getMyDescription",
    );
    return result.description?.trim() || null;
  } catch {
    return null;
  }
}

export async function clearQuoteSnapshot(): Promise<void> {
  try {
    await telegramCall("setMyDescription", { description: "" });
  } catch {
    // Best-effort; memory session is still cleared.
  }
}

export type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: { id?: number };
  };
};
