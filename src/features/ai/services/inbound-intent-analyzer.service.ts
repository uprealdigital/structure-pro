import { GoogleGenAI } from "@google/genai";
import { errorText, recordAiActivityLog } from "@/src/features/ai/services/activity-log.service";
import { readPartialIntents } from "@/src/features/ai/utils/inbound-intent-stream";
import { CATALOG } from "@/src/features/cpq/utils/catalog";
import type { QuoteSelections } from "@/src/features/cpq/types";
import {
  inboundIntentKindSchema,
  inboundIntentResultSchema,
  suggestionConfigChangesSchema,
  type InboundIntent,
  type InboundIntentKind,
  type SuggestionConfigChanges,
  type SuggestionConfigValue,
} from "@/src/features/ai/types";

const PRIMARY_MODEL = "gemini-3.1-flash-lite";
const FALLBACK_MODEL = "gemini-3.5-flash-lite";
const ATTEMPT_MS = 20_000;
const BUDGET_MS = 18_000;

const catalogOptions = `Styles, in list order:
${namedOptions(CATALOG.styles)}

Sizes, width x length in feet:
${CATALOG.sizes.map((size) => `${size.width}x${size.length}`).join(", ")}

Siding, in list order:
${namedOptions(CATALOG.sidingTypes)}

Roof types, in list order:
${namedOptions(CATALOG.roofTypes)}

Colors, in list order:
${namedOptions(CATALOG.colors)}

Flooring, in list order:
${namedOptions(CATALOG.flooring)}

doorStyle: single, double, none
wallFace: front, left, back, right
hasLoft, hasWindow, hasVent: true or false
height: wall height in feet, from 4 to 20
zip: a 5-digit ZIP code`;

const instruction = `You read inbound customer text messages for a building salesperson.
The messages are numbered. Return each intent separately. Never merge a specification change and a quote request into one intent.

Use kind "configuration" when they ask to change the building: size, style, siding, colors, roof, doors, windows, loft, vents, flooring, or any other specification.
Use kind "quote_request" only when the customer explicitly asks for a quote or an estimate. The message has to ask for one of those by name, such as "send me a quote" or "can I get an estimate".
A yes, "that works", or "looks good" is not a quote request. Asking to see a photo, a closeup, or the building is not a quote request. Do not infer a quote request from agreement or from context.

If one message asks for both, return both intents and include that message number on each.
messageIndexes lists the message numbers that belong to that intent.
summary is one or two sentences for that intent only.
Return at most one configuration intent. Its configChanges object is the complete set of changes to store.
Start from the current changes in the request. Apply the messages to that object and return the new object.
If the customer cancels a change, or says not to change that part, remove that property from the object.
If the same field is asked again, keep the latest request.
The current revisions in the request are the buildings as they are now. If the customer asks for a value that every current revision already has, leave that field out. A metal roof asked for again is not a change when roofTypeId is already metal. Include a field only when the requested value differs from the current revision.
Use an empty object when nothing should change, and for quote_request.

Use only these keys: styleId, width, length, height, sidingTypeId, roofTypeId, sidingColorId, trimColorId, roofColorId, shutterColorId, flooringId, hasLoft, hasWindow, hasVent, doorStyle, wallFace, zip.
Name fields must be an id from the lists below, never a label.
Match a full option name to that option. If they use one word, choose the first option in that list whose name contains the word. If no listed option matches, omit the field.
width and length are both required and must be one pair from the sizes list.
A color named as the siding color sets sidingColorId. Trim, roof, and shutter colors set trimColorId, roofColorId, and shutterColorId. A color with no part named sets sidingColorId and trimColorId.
configChanges lists only values that differ from the current revisions.

${catalogOptions}

If nothing matches, return an empty intents array.
Do not invent prices or products they did not mention.

In each intent, write kind first, then configChanges, then messageIndexes, then summary.
Reply with JSON only:
{"intents":[{"kind":"configuration"|"quote_request","configChanges":{},"messageIndexes":[1],"summary":""}]}`;

export type InboundAnalysis = {
  messages: string[];
  currentChanges: SuggestionConfigChanges;
  revisions: Array<{ name: string; selections: QuoteSelections }>;
  dealId?: string | null;
  activityIds?: number[];
};

export type InboundIntentSnapshot = {
  intents: Array<{
    kind: InboundIntentKind;
    configChanges: SuggestionConfigChanges;
    changesClosed: boolean;
  }>;
};

export type InboundIntentOptions = {
  signal?: AbortSignal;
  onPartial?: (snapshot: InboundIntentSnapshot) => void;
};

function namedOptions(items: Array<{ id: string; label: string }>): string {
  return items.map((item) => `${item.id}: ${item.label}`).join("\n");
}

function client(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

function requestText(input: InboundAnalysis): string {
  const messages = input.messages.map((message, index) => `${index + 1}. ${message}`).join("\n");
  const revisions =
    input.revisions.length > 0
      ? input.revisions.map((revision) => `${revision.name}\n${JSON.stringify(revision.selections)}`).join("\n\n")
      : "None";
  return `Current changes:\n${JSON.stringify(input.currentChanges)}\n\nCurrent revisions:\n${revisions}\n\nMessages:\n${messages}`;
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

function catalogId(items: Array<{ id: string }>, value: SuggestionConfigValue | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const id = value.trim();
  return items.some((item) => item.id === id) ? id : undefined;
}

function asNumber(value: SuggestionConfigValue | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

function asFlag(value: SuggestionConfigValue | undefined): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;
  const text = value.trim().toLowerCase();
  if (text === "true" || text === "yes") return true;
  if (text === "false" || text === "no") return false;
  return undefined;
}

function acceptedConfigChanges(value: Record<string, SuggestionConfigValue> | undefined): SuggestionConfigChanges {
  const raw = configChangesFrom(value);
  const changes: SuggestionConfigChanges = {};
  const styleId = catalogId(CATALOG.styles, raw.styleId);
  if (styleId) changes.styleId = styleId;
  const sidingTypeId = catalogId(CATALOG.sidingTypes, raw.sidingTypeId);
  if (sidingTypeId) changes.sidingTypeId = sidingTypeId;
  const roofTypeId = catalogId(CATALOG.roofTypes, raw.roofTypeId);
  if (roofTypeId) changes.roofTypeId = roofTypeId;
  const sidingColorId = catalogId(CATALOG.colors, raw.sidingColorId);
  if (sidingColorId) changes.sidingColorId = sidingColorId;
  const trimColorId = catalogId(CATALOG.colors, raw.trimColorId);
  if (trimColorId) changes.trimColorId = trimColorId;
  const roofColorId = catalogId(CATALOG.colors, raw.roofColorId);
  if (roofColorId) changes.roofColorId = roofColorId;
  const shutterColorId = catalogId(CATALOG.colors, raw.shutterColorId);
  if (shutterColorId) changes.shutterColorId = shutterColorId;
  const flooringId = catalogId(CATALOG.flooring, raw.flooringId);
  if (flooringId) changes.flooringId = flooringId;

  const width = asNumber(raw.width);
  const length = asNumber(raw.length);
  if (width != null && length != null && CATALOG.sizes.some((size) => size.width === width && size.length === length)) {
    changes.width = width;
    changes.length = length;
  }
  const height = asNumber(raw.height);
  if (height != null && height >= 4 && height <= 20) changes.height = height;

  const loft = asFlag(raw.hasLoft);
  if (loft != null) changes.hasLoft = loft;
  const window = asFlag(raw.hasWindow);
  if (window != null) changes.hasWindow = window;
  const vent = asFlag(raw.hasVent);
  if (vent != null) changes.hasVent = vent;

  if (raw.doorStyle === "single" || raw.doorStyle === "double" || raw.doorStyle === "none") changes.doorStyle = raw.doorStyle;
  if (raw.wallFace === "front" || raw.wallFace === "left" || raw.wallFace === "back" || raw.wallFace === "right") {
    changes.wallFace = raw.wallFace;
  }
  if (typeof raw.zip === "string" && /^\d{5}$/.test(raw.zip.trim())) changes.zip = raw.zip.trim();

  return suggestionConfigChangesSchema.parse(changes);
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

function readModelIntents(text: string, count: number): { ok: boolean; intents: InboundIntent[] } {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return { ok: false, intents: [] };
  try {
    JSON.parse(text.slice(start, end + 1));
  } catch {
    return { ok: false, intents: [] };
  }
  return { ok: true, intents: parseIntents(text, count) };
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
    const configChanges = kind.data === "configuration" ? acceptedConfigChanges(intent.configChanges) : {};
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
      configChanges,
      messageIndexes: [...new Set([...current.messageIndexes, ...messageIndexes])],
    });
  }
  return [...byKind.values()];
}

function intentsFromSnapshot(snapshot: InboundIntentSnapshot | null, count: number): InboundIntent[] {
  if (!snapshot) return [];
  const usable = snapshot.intents.filter(
    (intent) => intent.kind === "quote_request" || intent.changesClosed || Object.keys(intent.configChanges).length > 0,
  );
  if (usable.length === 0) return [];
  const messageIndexes = Array.from({ length: count }, (_, index) => index);
  return usable.map((intent) => ({
    kind: intent.kind,
    summary: "",
    configChanges: intent.kind === "configuration" ? intent.configChanges : {},
    messageIndexes,
  }));
}

function snapshotFrom(text: string): InboundIntentSnapshot | null {
  const read = readPartialIntents(text);
  if (!read) return null;
  return {
    intents: read.intents.map((intent) => ({
      kind: intent.kind,
      configChanges: acceptedConfigChanges(intent.configChanges),
      changesClosed: intent.changesClosed,
    })),
  };
}

async function readModel(
  ai: GoogleGenAI,
  model: string,
  input: InboundAnalysis,
  timeoutMs: number,
  signal: AbortSignal | undefined,
  onText: (text: string) => void,
): Promise<{ text: string; timedOut: boolean }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);
  let text = "";
  try {
    const stream = await ai.models.generateContentStream({
      model,
      contents: [{ role: "user", parts: [{ text: requestText(input) }] }],
      config: {
        systemInstruction: instruction,
        responseMimeType: "application/json",
        abortSignal: controller.signal,
      },
    });
    for await (const chunk of stream) {
      const piece = chunk.text ?? "";
      if (!piece) continue;
      text += piece;
      onText(text);
    }
    return { text: text.trim(), timedOut: false };
  } catch (error) {
    if (signal?.aborted) throw error;
    if (controller.signal.aborted) return { text: text.trim(), timedOut: true };
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

export async function analyzeInboundIntent(
  input: InboundAnalysis,
  options?: InboundIntentOptions,
): Promise<InboundIntent[]> {
  const started = Date.now();
  const messages = input.messages.map((message) => message.trim()).filter(Boolean).slice(-40);
  const request = { ...input, messages };
  let model: string | null = null;
  let rawResponse: string | null = null;
  let parsedResponse: unknown = null;
  let status: "detected" | "none" | "error" = "none";
  let errorMessage: string | null = null;
  let aborted = false;

  try {
    if (options?.signal?.aborted) {
      aborted = true;
      return [];
    }
    if (messages.length === 0) {
      parsedResponse = [];
      return [];
    }
    const ai = client();
    if (!ai) {
      status = "error";
      errorMessage = "GEMINI_API_KEY is not set";
      return [];
    }

    const preferred = process.env.GEMINI_MODEL?.trim() || PRIMARY_MODEL;
    const models = [...new Set([preferred, FALLBACK_MODEL])];
    const deadline = Date.now() + BUDGET_MS;
    let lastError: unknown;
    let lastSnapshot = "";
    let latest: InboundIntentSnapshot | null = null;
    let published = false;
    for (const candidate of models) {
      if (options?.signal?.aborted) {
        aborted = true;
        return [];
      }
      model = candidate;
      const remaining = Math.min(ATTEMPT_MS, deadline - Date.now());
      if (remaining < 1_000) {
        lastError = new Error("Gemini request timed out");
        break;
      }
      try {
        const read = await readModel(ai, candidate, request, remaining, options?.signal, (text) => {
          const snapshot = snapshotFrom(text);
          if (!snapshot) return;
          const key = JSON.stringify(snapshot);
          if (key === lastSnapshot) return;
          lastSnapshot = key;
          latest = snapshot;
          published = true;
          options?.onPartial?.(snapshot);
        });
        rawResponse = read.text;
        if (!read.text) {
          if (read.timedOut) lastError = new Error("Gemini request timed out");
          if (published) break;
          continue;
        }
        const parsed = readModelIntents(read.text, messages.length);
        parsedResponse = parsed.intents;
        if (!parsed.ok) {
          const partial = intentsFromSnapshot(latest, messages.length);
          if (partial.length > 0) {
            parsedResponse = partial;
            status = "detected";
            return partial;
          }
          lastError = new Error(read.timedOut ? "Gemini request timed out" : "Could not parse the model response");
          if (published) break;
          continue;
        }
        status = parsed.intents.length > 0 ? "detected" : "none";
        return parsed.intents;
      } catch (error) {
        if (options?.signal?.aborted) {
          aborted = true;
          return [];
        }
        lastError = error;
        console.error(error);
        if (published) break;
      }
    }
    status = "error";
    errorMessage = errorText(lastError);
    if (lastError) console.error(lastError);
    return [];
  } catch (error) {
    if (options?.signal?.aborted) {
      aborted = true;
      return [];
    }
    status = "error";
    errorMessage = errorText(error);
    console.error(error);
    return [];
  } finally {
    if (!aborted) {
      await recordAiActivityLog({
        dealId: input.dealId,
        activityIds: input.activityIds,
        feature: "inbound-intent-analyzer",
        promptPayload: {
          systemInstruction: instruction,
          request: messages.length > 0 ? requestText(request) : "",
        },
        model,
        rawResponse,
        parsedResponse,
        status,
        errorMessage,
        executionTimeMs: Date.now() - started,
      });
    }
  }
}
