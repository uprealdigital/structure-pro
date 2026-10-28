import type { InboundIntentKind, SuggestionConfigValue } from "@/src/features/ai/types";

export type PartialInboundIntent = {
  kind: InboundIntentKind;
  configChanges: Record<string, SuggestionConfigValue>;
  changesClosed: boolean;
  closed: boolean;
};

const kinds = new Set<InboundIntentKind>(["configuration", "quote_request"]);

export function readPartialIntents(text: string): { intents: PartialInboundIntent[]; partial: boolean } | null {
  const objects = intentObjects(text);
  const intents: PartialInboundIntent[] = [];
  for (const object of objects) {
    const kind = readKind(object.body);
    if (!kind) continue;
    const changes = readConfigChanges(object.body);
    intents.push({
      kind,
      configChanges: changes.values,
      changesClosed: changes.closed,
      closed: object.closed,
    });
  }
  if (intents.length === 0) return null;
  return { intents, partial: intents.some((intent) => !intent.changesClosed) };
}

function intentObjects(text: string): Array<{ body: string; closed: boolean }> {
  const marker = text.indexOf('"intents"');
  const list = marker >= 0 ? text.indexOf("[", marker) : -1;
  if (list < 0) return [];
  const objects: Array<{ body: string; closed: boolean }> = [];
  let i = list + 1;
  while (i < text.length) {
    while (i < text.length && /[\s,]/.test(text[i] ?? "")) i += 1;
    if (i >= text.length || text[i] === "]") break;
    if (text[i] !== "{") break;
    const object = readObject(text, i);
    objects.push({ body: text.slice(i, object.end), closed: object.closed });
    if (!object.closed) break;
    i = object.end;
  }
  return objects;
}

function readKind(body: string): InboundIntentKind | null {
  const match = /"kind"\s*:\s*"(configuration|quote_request)"/.exec(body);
  const kind = match?.[1];
  return kind && kinds.has(kind as InboundIntentKind) ? (kind as InboundIntentKind) : null;
}

function readConfigChanges(body: string): { values: Record<string, SuggestionConfigValue>; closed: boolean } {
  const keyAt = body.indexOf('"configChanges"');
  if (keyAt < 0) return { values: {}, closed: false };
  const brace = body.indexOf("{", keyAt);
  if (brace < 0) return { values: {}, closed: false };
  const values: Record<string, SuggestionConfigValue> = {};
  let i = brace + 1;
  while (i < body.length) {
    while (i < body.length && /[\s,]/.test(body[i] ?? "")) i += 1;
    if (i >= body.length) return { values, closed: false };
    if (body[i] === "}") return { values, closed: true };
    if (body[i] !== '"') return { values, closed: false };
    const key = readString(body, i);
    if (!key.complete) return { values, closed: false };
    i = key.end;
    while (i < body.length && /\s/.test(body[i] ?? "")) i += 1;
    if (body[i] !== ":") return { values, closed: false };
    i += 1;
    while (i < body.length && /\s/.test(body[i] ?? "")) i += 1;
    const value = readValue(body, i);
    if (!value.complete || value.value === undefined) return { values, closed: false };
    values[key.value] = value.value;
    i = value.end;
  }
  return { values, closed: false };
}

function readObject(text: string, start: number): { end: number; closed: boolean } {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return { end: i + 1, closed: true };
    }
  }
  return { end: text.length, closed: false };
}

function readString(text: string, start: number): { complete: boolean; value: string; end: number } {
  if (text[start] !== '"') return { complete: false, value: "", end: start };
  let value = "";
  for (let i = start + 1; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "\\") {
      const next = text[i + 1];
      if (next == null) return { complete: false, value: "", end: text.length };
      value += next === "n" ? "\n" : next === "t" ? "\t" : next;
      i += 1;
      continue;
    }
    if (ch === '"') return { complete: true, value, end: i + 1 };
    value += ch;
  }
  return { complete: false, value: "", end: text.length };
}

function readValue(
  text: string,
  start: number,
): { complete: boolean; value: SuggestionConfigValue | undefined; end: number } {
  if (text[start] === '"') {
    const textValue = readString(text, start);
    return { complete: textValue.complete, value: textValue.complete ? textValue.value : undefined, end: textValue.end };
  }
  const word = keywordValue(text, start, "true", true) ?? keywordValue(text, start, "false", false);
  if (word) return word;
  const match = /^-?\d+(?:\.\d+)?/.exec(text.slice(start));
  if (!match) return { complete: false, value: undefined, end: start };
  const end = start + match[0].length;
  if (!closedToken(text, end)) return { complete: false, value: undefined, end: start };
  const value = Number(match[0]);
  if (!Number.isFinite(value)) return { complete: false, value: undefined, end: start };
  return { complete: true, value, end };
}

function keywordValue(
  text: string,
  start: number,
  word: string,
  value: boolean,
): { complete: boolean; value: SuggestionConfigValue | undefined; end: number } | null {
  if (!text.startsWith(word, start)) return null;
  const end = start + word.length;
  if (!closedToken(text, end)) return { complete: false, value: undefined, end: start };
  return { complete: true, value, end };
}

function closedToken(text: string, end: number): boolean {
  const next = text[end];
  return next != null && /[\s,}\]]/.test(next);
}
