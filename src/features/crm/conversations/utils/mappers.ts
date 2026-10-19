import type { QuoteSelections } from "@/src/features/cpq/types";
import { priceSummary } from "@/src/features/cpq/utils/pricing";
import type { Customer } from "@/src/features/crm/common/types";
import {
  activityEventSchema,
  activitySchema,
  callSchema,
  conversationDealListItemSchema,
  conversationInboxItemSchema,
  conversationQuoteRevisionSchema,
  conversationQuoteSchema,
  conversationSchema,
  conversationSummarySchema,
  type Activity,
  type ActivityEvent,
  type Call,
  type Conversation,
  type ConversationDealListItem,
  type ConversationInboxItem,
  type ConversationQuote,
  type ConversationQuoteRevision,
  type ConversationSummary,
} from "@/src/features/crm/conversations/types";
import { formatDealMenuDate, productTitle, revisionSummary } from "@/src/features/crm/conversations/utils/formatting";
import type { Deal } from "@/src/features/crm/deals/types";

export type ConversationRow = {
  id: string;
  lookup_key: string;
  channel_key?: string | null;
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
  read_at?: string | null;
  call_id?: string | null;
  created_at?: string | null;
};

export function toConversation(row: ConversationRow, activities: Activity[]): Conversation | undefined {
  const conversation = conversationSchema.safeParse({
    id: row.id,
    lookupKey: row.lookup_key,
    channelKey: row.channel_key ?? undefined,
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
  const position = typeof row.position === "number" ? row.position : Number(row.position);
  const readAt = typeof row.read_at === "string" && row.read_at ? row.read_at : null;
  const activity = activitySchema.safeParse({
    position,
    role: row.role,
    text: row.body,
    channel: row.channel,
    generatedBy: row.generated_by ?? "manual",
    readAt,
    read: readAt != null,
    createdAt: row.created_at ?? undefined,
    call,
  });
  return activity.success ? activity.data : undefined;
}

export function toActivityEvent(row: object, call?: Call): ActivityEvent | undefined {
  const record = row as ActivityRow & { conversation_id?: unknown };
  const conversationId = record.conversation_id;
  if (typeof conversationId !== "string" || !conversationId) return undefined;
  const activity = toActivity(record, call);
  if (!activity) return undefined;
  const event = activityEventSchema.safeParse({ conversationId, activity });
  return event.success ? event.data : undefined;
}

export function toConversationSummary(row: ConversationSummaryRow): ConversationSummary | undefined {
  const summary = conversationSummarySchema.safeParse({
    id: row.id,
    lookupKey: row.lookup_key,
    channelKey: row.channel_key ?? undefined,
    chatId: row.chat_id ?? undefined,
    customerId: row.customer_id,
    contractSent: row.contract_sent,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at,
  });
  return summary.success ? summary.data : undefined;
}

export function toConversationInboxItem(input: {
  summary: ConversationSummary;
  customer: Customer;
  deal: Deal;
  deals: Deal[];
  preview: string;
  updatedAt: string;
  unread: boolean;
  unreadCount: number;
}): ConversationInboxItem | undefined {
  const linked = input.deals.length > 0 ? input.deals : [input.deal];
  const item = conversationInboxItemSchema.safeParse({
    id: input.summary.id,
    updatedAt: input.updatedAt,
    preview: input.preview,
    contactName: input.customer.fullName,
    contactPhone: input.customer.phone,
    contactEmail: input.customer.email,
    dealId: input.deal.id,
    dealStatus: input.deal.status,
    dealStatuses: linked.map((deal) => ({ id: deal.id, status: deal.status })),
    dealSource: input.deal.source,
    contractSent: input.summary.contractSent,
    unread: input.unread,
    unreadCount: input.unreadCount,
  });
  return item.success ? item.data : undefined;
}

export function toConversationDealListItem(input: {
  deal: Deal;
  invoiceId?: string;
  selections?: QuoteSelections;
  conversationId?: string;
}): ConversationDealListItem | undefined {
  const summary = input.selections ? priceSummary(input.selections) : undefined;
  const item = conversationDealListItemSchema.safeParse({
    id: input.deal.id,
    title: input.deal.name?.trim() || productTitle(summary?.specs ?? []) || input.invoiceId || "",
    priceLabel: summary?.totalLabel ?? "",
    stage: input.deal.status,
    dateLabel: formatDealMenuDate(input.deal.createdAt ?? ""),
    createdAt: input.deal.createdAt ?? "",
    conversationId: input.conversationId,
  });
  return item.success ? item.data : undefined;
}

export function toConversationQuoteRevision(input: {
  id: string;
  revisionNumber: number;
  status: "draft" | "sent";
  createdAt: string;
  updatedAt: string;
  selections: QuoteSelections;
  communication?: ConversationQuoteRevision["communication"];
}): ConversationQuoteRevision | undefined {
  const summary = priceSummary(input.selections);
  const revision = conversationQuoteRevisionSchema.safeParse({
    id: input.id,
    revisionNumber: input.revisionNumber,
    status: input.status,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    totalLabel: summary.totalLabel,
    summary: revisionSummary(summary.specs),
    specs: summary.specs,
    lines: summary.lines,
    imageUrl: summary.imageUrl,
    selections: input.selections,
    communication: input.communication ?? null,
  });
  return revision.success ? revision.data : undefined;
}

export function toConversationQuote(input: {
  id: string;
  invoiceId: string;
  totalLabel: string;
  specs: { label: string; value: string }[];
  lines: { label: string; amountLabel: string }[];
  imageUrl: string;
  selections: QuoteSelections;
  activeRevisionId: string;
  revisions: ConversationQuoteRevision[];
}): ConversationQuote | undefined {
  const quote = conversationQuoteSchema.safeParse(input);
  return quote.success ? quote.data : undefined;
}

export function conversationQuoteFromSelections(
  quote: ConversationQuote,
  selections: QuoteSelections,
  saved: { id: string; revisionNumber: number; createdAt: string; updatedAt: string },
): ConversationQuote | undefined {
  const revision = toConversationQuoteRevision({
    id: saved.id,
    revisionNumber: saved.revisionNumber,
    status: "draft",
    createdAt: saved.createdAt,
    updatedAt: saved.updatedAt,
    selections,
    communication: null,
  });
  if (!revision) return undefined;
  const summary = priceSummary(selections);
  return toConversationQuote({
    id: quote.id,
    invoiceId: quote.invoiceId,
    totalLabel: summary.totalLabel,
    specs: summary.specs,
    lines: summary.lines,
    imageUrl: summary.imageUrl,
    selections,
    activeRevisionId: revision.id,
    revisions: [...quote.revisions.filter((item) => item.id !== revision.id), revision],
  });
}

export function conversationQuoteWithActiveRevision(
  quote: ConversationQuote,
  revisionId: string,
): ConversationQuote | undefined {
  const revision = quote.revisions.find((item) => item.id === revisionId);
  if (!revision) return undefined;
  return toConversationQuote({
    id: quote.id,
    invoiceId: quote.invoiceId,
    totalLabel: revision.totalLabel,
    specs: revision.specs,
    lines: revision.lines,
    imageUrl: revision.imageUrl,
    selections: revision.selections,
    activeRevisionId: revision.id,
    revisions: quote.revisions,
  });
}

export function conversationQuoteWithSentRevision(
  quote: ConversationQuote,
  revisionId: string,
  updatedAt: string,
): ConversationQuote | undefined {
  return toConversationQuote({
    id: quote.id,
    invoiceId: quote.invoiceId,
    totalLabel: quote.totalLabel,
    specs: quote.specs,
    lines: quote.lines,
    imageUrl: quote.imageUrl,
    selections: quote.selections,
    activeRevisionId: quote.activeRevisionId,
    revisions: quote.revisions.map((revision) =>
      revision.id === revisionId ? { ...revision, status: "sent", updatedAt } : revision,
    ),
  });
}
