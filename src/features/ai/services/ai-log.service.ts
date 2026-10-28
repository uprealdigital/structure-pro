import {
  aiActivityStatusSchema,
  inboundIntentKindSchema,
  type AiActivityStatus,
  type InboundIntentKind,
} from "@/src/features/ai/types";

export const aiLogFixStatuses: readonly AiActivityStatus[] = aiActivityStatusSchema.options;

export type AiLogFixIntent = InboundIntentKind | "none";

export const aiLogFixIntents: readonly AiLogFixIntent[] = [...inboundIntentKindSchema.options, "none"];

export type AiLogFixLog = {
  id: string;
  feature: string;
  status: AiActivityStatus;
  logLevel?: string;
  errorMessage?: string | null;
  createdAt: string;
  model?: string | null;
  dealId?: string | null;
  activityIds?: number[];
  executionTimeMs?: number;
  promptPayload?: unknown;
  rawResponse?: string | null;
  parsedResponse?: unknown;
};

export type AiLogFixInput = {
  log: AiLogFixLog;
  expectedStatus: AiActivityStatus;
  expectedIntents: readonly AiLogFixIntent[];
};

const featureSource: Record<string, string> = {
  "inbound-intent-analyzer": "src/features/ai/services/inbound-intent-analyzer.service.ts",
  "deal-summary": "src/features/ai/services/deal-summary.service.ts",
  "yard-preview": "src/features/ai/utils/yard-preview.ts",
  render: "src/features/ai/services/render.service.ts",
};

const clipLength = 4000;

function normalizeIntents(intents: readonly AiLogFixIntent[]): AiLogFixIntent[] {
  const found = aiLogFixIntents.filter((intent) => intent !== "none" && intents.includes(intent));
  return found.length > 0 ? [...found] : ["none"];
}

function kindOf(value: unknown): AiLogFixIntent | null {
  if (!value || typeof value !== "object") return null;
  const kind = (value as { kind?: unknown }).kind;
  if (kind === "configuration" || kind === "quote_request" || kind === "none") return kind;
  return null;
}

export function foundAiLogIntents(parsedResponse: unknown): AiLogFixIntent[] {
  const found: AiLogFixIntent[] = [];
  function push(kind: AiLogFixIntent | null) {
    if (!kind || found.includes(kind)) return;
    found.push(kind);
  }
  if (Array.isArray(parsedResponse)) {
    for (const item of parsedResponse) push(kindOf(item));
  } else if (parsedResponse && typeof parsedResponse === "object") {
    const record = parsedResponse as { intents?: unknown };
    if (Array.isArray(record.intents)) {
      for (const item of record.intents) push(kindOf(item));
    } else {
      push(kindOf(parsedResponse));
    }
  }
  return normalizeIntents(found);
}

function pretty(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function clip(value: string): string {
  const text = value.trim();
  if (!text) return "(empty)";
  if (text.length <= clipLength) return text;
  return `${text.slice(0, clipLength)}\n…[truncated]`;
}

function requestText(payload: unknown): string {
  if (typeof payload === "string") return payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return pretty(payload);
  const record = { ...(payload as Record<string, unknown>) };
  if (typeof record.request === "string") return record.request;
  delete record.systemInstruction;
  return pretty(record);
}

function statusMeaning(feature: string, status: AiActivityStatus): string {
  if (feature === "inbound-intent-analyzer") {
    if (status === "detected") return "an intent was found";
    if (status === "none") return "no intent was found";
    return "the analyzer failed";
  }
  if (status === "detected") return "a result was found";
  if (status === "none") return "nothing was found";
  return "the run failed";
}

const intentMeaning: Record<AiLogFixIntent, string> = {
  configuration: "a configuration change",
  quote_request: "a quote request",
  none: "no intent",
};

function statusText(feature: string, status: AiActivityStatus): string {
  return `${status} (${statusMeaning(feature, status)})`;
}

function intentText(intents: readonly AiLogFixIntent[]): string {
  return normalizeIntents(intents)
    .map((intent) => `${intent} (${intentMeaning[intent]})`)
    .join(", ");
}

function list(values: number[] | undefined): string {
  if (!values || values.length === 0) return "(none)";
  return values.join(", ");
}

function correction(
  feature: string,
  foundStatus: AiActivityStatus,
  expectedStatus: AiActivityStatus,
  foundIntents: readonly AiLogFixIntent[],
  expectedIntents: readonly AiLogFixIntent[],
): string {
  const statusLine =
    foundStatus === expectedStatus
      ? `Status was correct: ${statusText(feature, foundStatus)}.`
      : `Status was ${statusText(feature, foundStatus)}. It should have been ${statusText(feature, expectedStatus)}.`;
  const found = intentText(foundIntents);
  const expected = intentText(expectedIntents);
  const intentLine =
    found === expected
      ? `Intent was correct: ${found}.`
      : `Intent was ${found}. It should have been ${expected}.`;
  return `${statusLine}\n${intentLine}`;
}

export function buildAiLogFixPrompt(input: AiLogFixInput): string {
  const { log } = input;
  const foundIntents = foundAiLogIntents(log.parsedResponse);
  const expectedIntents = normalizeIntents(input.expectedIntents);
  const source = featureSource[log.feature] ?? `the code that records activity logs for "${log.feature}"`;
  const lines = [
    "An AI activity log recorded the wrong outcome. Adjust the instruction or the code that produced it so the next run matches the expected status and intent.",
    "",
    `Source: ${source}`,
    `Feature: ${log.feature}`,
    "",
    "Log",
    `id: ${log.id}`,
    `created: ${log.createdAt}`,
    `model: ${log.model?.trim() || "(none)"}`,
    `deal: ${log.dealId?.trim() || "(none)"}`,
    `activity ids: ${list(log.activityIds)}`,
    `duration: ${typeof log.executionTimeMs === "number" ? `${log.executionTimeMs} ms` : "(unknown)"}`,
    `level: ${log.logLevel || "(unknown)"}`,
    `error: ${log.errorMessage?.trim() || "(none)"}`,
    "",
    "What was recorded",
    `status: ${statusText(log.feature, log.status)}`,
    `intent: ${intentText(foundIntents)}`,
    "",
    "What it should have been",
    correction(log.feature, log.status, input.expectedStatus, foundIntents, expectedIntents),
    "",
    "Request sent to the model",
    clip(requestText(log.promptPayload)),
    "",
    "Parsed response",
    clip(pretty(log.parsedResponse)),
    "",
    "Raw model response",
    clip(log.rawResponse ?? ""),
    "",
    "Change the instruction or the code for this feature so this kind of input records the expected status and intent next time. Leave outcomes that were already correct alone. Do not invent prices, products, or fields that are not in the request.",
  ];
  return lines.join("\n");
}
