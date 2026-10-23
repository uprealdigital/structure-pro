import { suggestionSchema, yardPreviewSchema, type Suggestion, type YardPreview } from "@/src/features/ai/types";

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

export function toSuggestion(row: SuggestionRow): Suggestion | undefined {
  const suggestion = suggestionSchema.safeParse({
    id: row.id,
    dealId: row.deal_id,
    messageIds: messageIds(row.message_ids),
    intent: row.intent,
    status: row.status,
    configChanges: configChanges(row.config_changes),
    createdAt: row.created_at,
  });
  return suggestion.success ? suggestion.data : undefined;
}
