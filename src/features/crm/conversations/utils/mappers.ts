import type { Customer } from "@/src/features/crm/common/types";
import {
  activitySchema,
  callSchema,
  conversationInboxItemSchema,
  conversationQuoteSchema,
  conversationSchema,
  conversationSummarySchema,
  type Activity,
  type Call,
  type Conversation,
  type ConversationInboxItem,
  type ConversationQuote,
  type ConversationSummary,
} from "@/src/features/crm/conversations/types";
import type { Deal } from "@/src/features/crm/deals/types";

export type ConversationRow = {
  id: string;
  lookup_key: string;
  chat_id: string | null;
  customer_id: string;
  contract_sent: boolean;
  created_at?: string | null;
};

export type ConversationSummaryRow = ConversationRow & {
  updated_at: string;
};

export type CallRow = {
  id: string;
  direction: string;
  duration_seconds?: number | null;
  script_match?: number | null;
  recording_url?: string | null;
  transcript?: string | null;
  external_id?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
};

export type ActivityRow = {
  position: number;
  channel: string;
  role: string;
  body: string;
  generated_by?: string | null;
  call_id?: string | null;
  created_at?: string | null;
};

export function toConversation(row: ConversationRow, activities: Activity[]): Conversation | undefined {
  const conversation = conversationSchema.safeParse({
    id: row.id,
    lookupKey: row.lookup_key,
    chatId: row.chat_id ?? undefined,
    customerId: row.customer_id,
    contractSent: row.contract_sent,
    createdAt: row.created_at ?? undefined,
    activities,
  });
  return conversation.success ? conversation.data : undefined;
}

export function toCall(row: CallRow): Call | undefined {
  const call = callSchema.safeParse({
    id: row.id,
    direction: row.direction,
    durationSeconds: row.duration_seconds ?? undefined,
    scriptMatch: row.script_match ?? undefined,
    recordingUrl: row.recording_url ?? undefined,
    transcript: row.transcript ?? undefined,
    externalId: row.external_id ?? undefined,
    startedAt: row.started_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
  });
  return call.success ? call.data : undefined;
}

export function toActivity(row: ActivityRow, call?: Call): Activity | undefined {
  const activity = activitySchema.safeParse({
    role: row.role,
    text: row.body,
    channel: row.channel,
    generatedBy: row.generated_by ?? "manual",
    createdAt: row.created_at ?? undefined,
    call,
  });
  return activity.success ? activity.data : undefined;
}

export function toConversationSummary(row: ConversationSummaryRow): ConversationSummary | undefined {
  const summary = conversationSummarySchema.safeParse({
    id: row.id,
    lookupKey: row.lookup_key,
    chatId: row.chat_id ?? undefined,
    customerId: row.customer_id,
    contractSent: row.contract_sent,
    updatedAt: row.updated_at,
  });
  return summary.success ? summary.data : undefined;
}

export function toConversationInboxItem(input: {
  summary: ConversationSummary;
  customer: Customer;
  deal: Deal;
  preview: string;
}): ConversationInboxItem | undefined {
  const item = conversationInboxItemSchema.safeParse({
    id: input.summary.id,
    updatedAt: input.summary.updatedAt,
    preview: input.preview,
    contactName: input.customer.fullName,
    contactPhone: input.customer.phone,
    contactEmail: input.customer.email,
    dealStatus: input.deal.status,
    dealSource: input.deal.source,
    contractSent: input.summary.contractSent,
  });
  return item.success ? item.data : undefined;
}

export function toConversationQuote(input: {
  id: string;
  invoiceId: string;
  totalLabel: string;
  specs: { label: string; value: string }[];
  lines: { label: string; amountLabel: string }[];
  imageUrl: string;
}): ConversationQuote | undefined {
  const quote = conversationQuoteSchema.safeParse(input);
  return quote.success ? quote.data : undefined;
}
