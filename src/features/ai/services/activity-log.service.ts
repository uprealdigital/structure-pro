import { createActivityLog } from "@/src/features/ai/db/activity-log";
import {
  aiActivityLogWriteSchema,
  type AiActivityLogWrite,
  type AiActivityStatus,
} from "@/src/features/ai/types";

export type AiActivityDraft = {
  dealId?: string | null;
  activityIds?: number[];
  feature: string;
  promptPayload: unknown;
  model?: string | null;
  rawResponse?: string | null;
  parsedResponse?: unknown;
  status: AiActivityStatus;
  errorMessage?: string | null;
  executionTimeMs: number;
};

function activityIds(value: number[] | undefined): number[] {
  if (!value) return [];
  return value.filter((id) => Number.isInteger(id) && id > 0).slice(0, 40);
}

function dealId(value: string | null | undefined): string | null {
  const id = value?.trim() ?? "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : null;
}

export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "The model request failed";
}

function issueText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return "Request failed";
}

export async function recordAiIssue(feature: string, error: unknown, status: AiActivityDraft["status"] = "error"): Promise<void> {
  await recordAiActivityLog({
    feature,
    promptPayload: {},
    status,
    errorMessage: issueText(error),
    executionTimeMs: 0,
  });
}

export async function recordAiActivityLog(input: AiActivityDraft): Promise<void> {
  const draft: AiActivityLogWrite = {
    dealId: dealId(input.dealId),
    activityIds: activityIds(input.activityIds),
    feature: input.feature,
    promptPayload: input.promptPayload ?? {},
    model: input.model?.trim() || null,
    rawResponse: input.rawResponse ?? null,
    parsedResponse: input.parsedResponse ?? null,
    status: input.status,
    errorMessage: input.errorMessage?.trim() || null,
    executionTimeMs: Math.max(0, Math.round(input.executionTimeMs)),
  };
  const parsed = aiActivityLogWriteSchema.safeParse(draft);
  if (!parsed.success) {
    console.error(parsed.error);
    return;
  }
  try {
    await createActivityLog(parsed.data);
  } catch (error) {
    console.error(error);
  }
}
