import { messageParts } from "@/src/features/crm/conversations/utils/message-links";

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

export async function sendTelegramFile(
  chatId: string,
  file: { name: string; type: string; bytes: Uint8Array },
): Promise<void> {
  const image = file.type.startsWith("image/");
  const method = image ? "sendPhoto" : "sendDocument";
  const field = image ? "photo" : "document";
  const copy = new ArrayBuffer(file.bytes.byteLength);
  new Uint8Array(copy).set(file.bytes);
  const body = new FormData();
  body.set("chat_id", chatId);
  body.set(field, new Blob([copy], { type: file.type || "application/octet-stream" }), file.name);
  const response = await fetch(apiUrl(method), { method: "POST", body });
  const payload = (await response.json()) as TelegramResult<unknown>;
  if (!payload.ok) {
    throw new Error(payload.description || `Telegram ${method} failed`);
  }
}

function escapeTelegramHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/** Wrap detected links in HTML anchors. Other text is escaped and otherwise unchanged. */
function telegramHtml(text: string): string | undefined {
  const parts = messageParts(text);
  if (!parts.some((part) => part.kind === "link")) return undefined;
  return parts
    .map((part) => {
      if (part.kind === "text") return escapeTelegramHtml(part.value);
      const href = escapeTelegramHtml(part.href).replaceAll('"', "&quot;");
      return `<a href="${href}">${escapeTelegramHtml(part.label)}</a>`;
    })
    .join("");
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
): Promise<void> {
  const html = telegramHtml(text);
  const chunks = html ? splitTelegramHtml(html) : splitTelegram(text);
  for (const chunk of chunks) {
    if (!chunk) continue;
    await telegramCall("sendMessage", {
      chat_id: chatId,
      text: chunk,
      ...(html ? { parse_mode: "HTML" } : {}),
    });
  }
}

function splitTelegramHtml(body: string, max = 4000): string[] {
  const text = body.trim();
  if (!text) return [""];
  if (text.length <= max) return [text];

  const parts: string[] = [];
  let remaining = text;
  while (remaining.length > max) {
    let cut = remaining.lastIndexOf("\n", max);
    if (cut < 1) cut = remaining.lastIndexOf(" ", max);
    if (cut < 1) cut = max;
    const head = remaining.slice(0, cut);
    const open = head.lastIndexOf("<a ");
    const close = head.lastIndexOf("</a>");
    if (open > close) {
      if (open > 0) cut = open;
      else {
        const end = remaining.indexOf("</a>");
        cut = end === -1 ? remaining.length : end + "</a>".length;
      }
    }
    const piece = remaining.slice(0, cut).trim();
    if (!piece) break;
    parts.push(piece);
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) parts.push(remaining);
  return parts;
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
