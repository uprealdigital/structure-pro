import { GoogleGenAI } from "@google/genai";
import {
  inboundIntentKindSchema,
  inboundIntentResultSchema,
  type InboundIntent,
  type InboundIntentKind,
  type SuggestionConfigValue,
} from "@/src/features/ai/types";

const PRIMARY_MODEL = "gemini-3.1-flash-lite";
const FALLBACK_MODEL = "gemini-3.5-flash-lite";
const ATTEMPT_MS = 20_000;

const instruction = `You read inbound customer text messages for a building salesperson.
The messages are numbered. Return each intent separately. Never merge a specification change and a quote request into one intent.

Use kind "configuration" when they ask to change the building: size, style, siding, colors, roof, doors, windows, loft, vents, flooring, or any other specification.
Use kind "quote_request" when they ask to receive, resend, or look at their quote, invoice, or contract.

If one message asks for both, return both intents and include that message number on each.
messageIndexes lists the message numbers that belong to that intent.
summary is one or two sentences for that intent only.
configChanges is the specification fields a configuration intent asked to change. Use only these keys: styleId, width, length, height, sidingTypeId, roofTypeId, sidingColorId, trimColorId, roofColorId, shutterColorId, flooringId, hasLoft, hasWindow, hasVent, doorStyle, wallFace, zip.
Put the customer's own words on name fields. Use numbers for width, length, and height. Use true or false for hasLoft, hasWindow, and hasVent. doorStyle is single, double, or none. wallFace is front, left, back, or right.
Combine every specification from that intent's messages. If the same field is asked again, keep the latest request. Use an empty object for quote_request.
If nothing matches, return an empty intents array.
Do not invent prices or products they did not mention.

Reply with JSON only:
{"intents":[{"kind":"configuration"|"quote_request","summary":"","configChanges":{},"messageIndexes":[1]}]}`;

function client(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Gemini request timed out")), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function transcript(messages: string[]): string {
  return messages.map((message, index) => `${index + 1}. ${message}`).join("\n");
}

function configChangesFrom(value: Record<string, SuggestionConfigValue> | undefined): Record<string, SuggestionConfigValue> {
  if (!value) return {};
  const changes: Record<string, SuggestionConfigValue> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string") {
      const text = item.trim();
      if (text) changes[key] = text;
      continue;
    }
    if (typeof item === "number" && Number.isFinite(item)) changes[key] = item;
    if (typeof item === "boolean") changes[key] = item;
  }
  return changes;
}

function indexesFor(raw: number[] | undefined, count: number): number[] {
  if (!raw || raw.length === 0) return Array.from({ length: count }, (_, index) => index);
  const zeroBased = raw.some((value) => Math.trunc(value) === 0);
  const indexes = raw.map((value) => {
    const index = Math.trunc(value);
    return zeroBased ? index : index - 1;
  });
  return [...new Set(indexes.filter((index) => index >= 0 && index < count))];
}

function parseIntents(text: string, count: number): InboundIntent[] {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    return [];
  }
  const record = raw as { kind?: unknown; intents?: unknown };
  const payload = Array.isArray(record.intents) || record.kind == null ? raw : { intents: [raw] };
  const parsed = inboundIntentResultSchema.safeParse(payload);
  if (!parsed.success) return [];

  const byKind = new Map<InboundIntentKind, InboundIntent>();
  for (const intent of parsed.data.intents ?? []) {
    const kind = inboundIntentKindSchema.safeParse(intent.kind);
    if (!kind.success) continue;
    const current = byKind.get(kind.data);
    const configChanges = kind.data === "configuration" ? configChangesFrom(intent.configChanges) : {};
    const messageIndexes = indexesFor(intent.messageIndexes, count);
    if (!current) {
      byKind.set(kind.data, {
        kind: kind.data,
        summary: intent.summary?.trim() ?? "",
        configChanges,
        messageIndexes,
      });
      continue;
    }
    const summaries = [current.summary, intent.summary?.trim() ?? ""].filter(Boolean);
    byKind.set(kind.data, {
      kind: kind.data,
      summary: summaries[0] ?? "",
      configChanges: { ...current.configChanges, ...configChanges },
      messageIndexes: [...new Set([...current.messageIndexes, ...messageIndexes])],
    });
  }
  return [...byKind.values()];
}

async function ask(ai: GoogleGenAI, model: string, messages: string[]): Promise<string> {
  const response = await withTimeout(
    ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: transcript(messages) }] }],
      config: {
        systemInstruction: instruction,
        responseMimeType: "application/json",
      },
    }),
    ATTEMPT_MS,
  );
  return response.text?.trim() ?? "";
}

export async function analyzeInboundIntent(messages: string[]): Promise<InboundIntent[]> {
  const trimmed = messages.map((message) => message.trim()).filter(Boolean).slice(-40);
  if (trimmed.length === 0) return [];
  const ai = client();
  if (!ai) return [];

  const preferred = process.env.GEMINI_MODEL?.trim() || PRIMARY_MODEL;
  const models = [...new Set([preferred, FALLBACK_MODEL])];
  let lastError: unknown;
  for (const model of models) {
    try {
      return parseIntents(await ask(ai, model, trimmed), trimmed.length);
    } catch (error) {
      lastError = error;
      console.error(error);
    }
  }
  if (lastError) console.error(lastError);
  return [];
}
