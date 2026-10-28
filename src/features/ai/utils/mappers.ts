import {
  aiActivityLogSchema,
  suggestionSchema,
  yardPreviewSchema,
  type AiActivityLog,
  type Suggestion,
  type YardPreview,
} from "@/src/features/ai/types";

export type YardPreviewRow = {
  id: string;
  crm_customer_id: string;
  crm_deal_id: string;
  status: string;
  error: unknown;
};

export function toYardPreview(row: YardPreviewRow): YardPreview | undefined {
  const preview = yardPreviewSchema.safeParse({
    id: row.id,
    crmCustomerId: row.crm_customer_id,
    crmDealId: row.crm_deal_id,
    status: row.status,
    error: typeof row.error === "string" ? row.error : null,
  });
  return preview.success ? preview.data : undefined;
}

export type SuggestionRow = {
  id: string;
  deal_id: string;
  message_ids: unknown;
  intent: string;
  status: string;
  config_changes: unknown;
  preview_image_url?: unknown;
  created_at: string;
};

function messageIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const id = typeof item === "number" ? item : typeof item === "string" ? Number(item) : Number.NaN;
    return Number.isInteger(id) && id > 0 ? [id] : [];
  });
}

function configChanges(value: unknown): unknown {
  const parsed = typeof value === "string" ? parsedJson(value) : value;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
}

function parsedJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

export type AiActivityLogRow = {
  id: string;
  deal_id: string | null;
  activity_ids: unknown;
  feature: string;
  prompt_payload: unknown;
  model: string | null;
  raw_response: string | null;
  parsed_response: unknown;
  status: string;
  error_message: string | null;
  execution_time_ms: number;
  read_at: string | null;
  created_at: string;
};

function activityIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const id = typeof item === "number" ? item : typeof item === "string" ? Number(item) : Number.NaN;
    return Number.isInteger(id) && id > 0 ? [id] : [];
  });
}

function jsonValue(value: unknown): unknown {
  if (value == null) return null;
  if (typeof value === "string") {
    const parsed = parsedJson(value);
    return parsed === value ? value : parsed;
  }
  return value;
}

export function toAiActivityLog(row: AiActivityLogRow): AiActivityLog | undefined {
  const executionTimeMs =
    typeof row.execution_time_ms === "number" ? row.execution_time_ms : Number(row.execution_time_ms);
  const log = aiActivityLogSchema.safeParse({
    id: row.id,
    dealId: row.deal_id,
    activityIds: activityIds(row.activity_ids),
    feature: row.feature,
    promptPayload: jsonValue(row.prompt_payload) ?? {},
    model: row.model,
    rawResponse: row.raw_response,
    parsedResponse: jsonValue(row.parsed_response),
    status: row.status,
    errorMessage: row.error_message,
    executionTimeMs,
    readAt: row.read_at,
    createdAt: row.created_at,
  });
  return log.success ? log.data : undefined;
}

export function toSuggestion(row: SuggestionRow): Suggestion | undefined {
  const suggestion = suggestionSchema.safeParse({
    id: row.id,
    dealId: row.deal_id,
    messageIds: messageIds(row.message_ids),
    intent: row.intent,
    status: row.status,
    configChanges: configChanges(row.config_changes),
    previewImageUrl: typeof row.preview_image_url === "string" && row.preview_image_url ? row.preview_image_url : null,
    createdAt: row.created_at,
  });
  return suggestion.success ? suggestion.data : undefined;
}
