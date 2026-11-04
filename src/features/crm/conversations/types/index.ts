import { z } from "zod";
import { suggestionIntentSchema } from "@/src/features/ai/types";
import { quoteSelectionsSchema } from "@/src/features/cpq/types";
import {
  configChangesSchema,
  quoteCommunicationSchema,
  quoteStatusSchema,
  quoteRevisionRendersSchema,
} from "@/src/features/crm/quotes/types";
import { customerSchema } from "@/src/features/crm/common/types";
import {
  dealIdSchema,
  dealSchema,
  dealSourceSchema,
  dealStageSchema,
  dealStatusSchema,
} from "@/src/features/crm/deals/types";

export const activityChannelSchema = z.enum([
  "call",
  "sms",
  "facebook",
  "email",
  "telegram",
  "system",
]);

export type ActivityChannel = z.infer<typeof activityChannelSchema>;

export const generatedBySchema = z.enum(["ai", "manual"]);
export type GeneratedBy = z.infer<typeof generatedBySchema>;

export const composerChannelSchema = z.enum(["telegram", "sms", "facebook", "email"]);
export type ComposerChannel = z.infer<typeof composerChannelSchema>;

export const callDirectionSchema = z.enum(["inbound", "outbound"]);
export type CallDirection = z.infer<typeof callDirectionSchema>;

export const callSchema = z.object({
  id: z.string(),
  direction: callDirectionSchema,
  durationSeconds: z.number().int().nonnegative().optional(),
  scriptMatch: z.number().int().min(0).max(100).optional(),
  recordingUrl: z.string().optional(),
  transcript: z.string().optional(),
  externalId: z.string().optional(),
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
});

export type Call = z.infer<typeof callSchema>;

export const callDraftSchema = z.object({
  direction: callDirectionSchema.optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
  scriptMatch: z.number().int().min(0).max(100).optional(),
  recordingUrl: z.string().optional(),
  transcript: z.string().optional(),
  externalId: z.string().optional(),
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
});

export type CallDraft = z.infer<typeof callDraftSchema>;

export const activitySchema = z.object({
  position: z.number().int().nonnegative(),
  role: z.enum(["user", "model"]),
  text: z.string(),
  channel: activityChannelSchema,
  generatedBy: generatedBySchema,
  read: z.boolean(),
  readAt: z.string().nullable(),
  createdAt: z.string().optional(),
  call: callSchema.optional(),
});

export type Activity = z.infer<typeof activitySchema>;

export const activityEventSchema = z.object({
  conversationId: z.string().trim().min(1),
  activity: activitySchema,
});

export type ActivityEvent = z.infer<typeof activityEventSchema>;

export const activityReadEventSchema = z.object({
  conversationId: z.string().trim().min(1),
  position: z.number().int().nonnegative(),
  readAt: z.string().nullable(),
  unread: z.boolean(),
  unreadCount: z.number().int().nonnegative(),
});

export type ActivityReadEvent = z.infer<typeof activityReadEventSchema>;

export const activityInsertSchema = z
  .object({
    role: z.enum(["user", "model"]),
    text: z.string(),
    channel: activityChannelSchema,
    generatedBy: generatedBySchema.default("manual"),
    createdAt: z.string().optional(),
    readAt: z.string().optional(),
    call: callDraftSchema.optional(),
  })
  .refine((activity) => activity.channel !== "call" || Boolean(activity.call?.direction), {
    message: "A call activity needs a direction",
    path: ["call", "direction"],
  });

export type ActivityInsert = z.infer<typeof activityInsertSchema>;

export const conversationSchema = z.object({
  id: z.string(),
  lookupKey: z.string(),
  channelKey: z.string().optional(),
  chatId: z.string().optional(),
  customerId: z.string(),
  contractSent: z.boolean(),
  createdAt: z.string().optional(),
  activities: z.array(activitySchema),
});

export type Conversation = z.infer<typeof conversationSchema>;

export const conversationIdSchema = z.string().trim().min(1);

export const visibleActivityReadSchema = z.object({
  conversationId: conversationIdSchema,
  positions: z.array(z.number().int().nonnegative()).min(1).max(100),
});

export const conversationReadUpdateSchema = z.object({
  conversationIds: z.array(conversationIdSchema).min(1),
  read: z.boolean(),
});

export type ConversationReadUpdate = z.infer<typeof conversationReadUpdateSchema>;

export const conversationWriteSchema = z.object({
  lookupKey: z.string(),
  channelKey: z.string().optional(),
  chatId: z.string().optional(),
  customerId: z.string(),
  contractSent: z.boolean(),
  activities: z.array(activityInsertSchema),
});

export const conversationPatchSchema = z.object({
  contractSent: z.boolean().optional(),
});

export const conversationAddressSchema = z.object({
  channelKey: z.string().trim().min(1).optional(),
  chatId: z.string().trim().min(1).optional(),
});

export const activeDealRequestSchema = z.object({
  customerId: z.string().trim().min(1),
  dealId: dealIdSchema,
});

export const setDealPersonSchema = z.object({
  customerId: z.string().trim().min(1),
  dealId: dealIdSchema,
  included: z.boolean(),
});

export const moveQuoteToNewDealSchema = z.object({
  dealId: dealIdSchema,
  quoteId: z.string().trim().min(1),
});

export const createConnectedDealSchema = z.object({
  dealId: dealIdSchema,
});

export const undoMoveQuoteToNewDealSchema = z.object({
  quoteId: z.string().trim().min(1),
  sourceDealId: dealIdSchema,
  createdDealId: dealIdSchema,
  wasPrimary: z.boolean(),
});

export const conversationSummarySchema = z.object({
  id: z.string(),
  lookupKey: z.string(),
  channelKey: z.string().optional(),
  chatId: z.string().optional(),
  customerId: z.string(),
  contractSent: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string(),
});

export type ConversationSummary = z.infer<typeof conversationSummarySchema>;

export const conversationListCallSchema = z.object({
  id: z.string(),
  direction: callDirectionSchema,
  duration_seconds: z.number().int().nonnegative().nullable(),
});

export const conversationListActivitySchema = z.object({
  position: z.number().int().nonnegative(),
  role: z.enum(["user", "model"]),
  body: z.string(),
  channel: activityChannelSchema,
  generated_by: generatedBySchema,
  read_at: z.string().nullable(),
  created_at: z.string(),
  call: conversationListCallSchema.nullable(),
});

export const conversationListDealSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  source: dealSourceSchema,
  status: dealStatusSchema,
  created_at: z.string(),
});

export const conversationListCustomerSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  phone: z.string(),
  email: z.string(),
  active_deal_id: z.string().nullable(),
  deal_customers: z.array(
    z.object({
      is_primary: z.boolean(),
      deal: conversationListDealSchema,
    }),
  ),
});

export const conversationListItemSchema = z.object({
  id: z.string(),
  contract_sent: z.boolean(),
  updated_at: z.string(),
  customer: conversationListCustomerSchema,
  activities: z.array(conversationListActivitySchema),
});

export type ConversationListItem = z.infer<typeof conversationListItemSchema>;

export const conversationDetailRevisionSchema = z.object({
  id: z.string(),
  revision_number: z.number().int().positive(),
  status: quoteStatusSchema,
  config: quoteSelectionsSchema,
  config_changes: configChangesSchema,
  communication: quoteCommunicationSchema.nullable(),
  renders: quoteRevisionRendersSchema.nullable(),
  shared_photos_at: z.string().nullable(),
  shared_quote_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const conversationDetailQuoteSchema = z.object({
  id: z.string(),
  invoice_id: z.string(),
  quote_number: z.number().int().positive(),
  status: quoteStatusSchema,
  active_revision_id: z.string().nullable(),
  quote_revisions: z.array(conversationDetailRevisionSchema),
});

export type ConversationDetailQuote = z.infer<typeof conversationDetailQuoteSchema>;

const conversationDetailLinkSchema = z.object({ id: z.string() });

export const conversationDetailPersonSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  phone: z.string(),
  email: z.string(),
  opted_out: z.boolean(),
  active_deal_id: z.string().nullable(),
  created_at: z.string(),
  conversations: z.union([conversationDetailLinkSchema, z.array(conversationDetailLinkSchema)]).nullable(),
});

export type ConversationDetailPerson = z.infer<typeof conversationDetailPersonSchema>;

export const conversationDetailCallSchema = z.object({
  id: z.string(),
  direction: callDirectionSchema,
  duration_seconds: z.number().int().nonnegative().nullable(),
  script_match: z.number().int().nullable(),
  recording_url: z.string().nullable(),
  transcript: z.string().nullable(),
  external_id: z.string().nullable(),
  started_at: z.string().nullable(),
  ended_at: z.string().nullable(),
});

export const conversationDetailActivitySchema = z.object({
  position: z.number().int().nonnegative(),
  role: z.enum(["user", "model"]),
  body: z.string(),
  channel: activityChannelSchema,
  generated_by: generatedBySchema,
  read_at: z.string().nullable(),
  created_at: z.string(),
  call: conversationDetailCallSchema.nullable(),
});

export const conversationDetailDealSchema = z.object({
  id: z.string(),
  quote_id: z.string().nullable(),
  source: dealSourceSchema,
  status: dealStatusSchema,
  previous_status: dealStatusSchema.nullable(),
  name: z.string().nullable(),
  viewed_at: z.string().nullable(),
  created_at: z.string(),
  quote: conversationDetailQuoteSchema.nullable(),
  deal_quotes: z.array(z.object({ quote: conversationDetailQuoteSchema })),
  deal_customers: z.array(
    z.object({
      is_primary: z.boolean(),
      customer: conversationDetailPersonSchema,
    }),
  ),
});

export const conversationDetailSchema = z.object({
  id: z.string(),
  contract_sent: z.boolean(),
  created_at: z.string(),
  customer: z.object({
    id: z.string(),
    full_name: z.string(),
    phone: z.string(),
    email: z.string(),
    opted_out: z.boolean(),
    active_deal_id: z.string().nullable(),
    created_at: z.string(),
    deal_customers: z.array(
      z.object({
        is_primary: z.boolean(),
        deal: conversationDetailDealSchema,
      }),
    ),
  }),
  activities: z.array(conversationDetailActivitySchema),
});

export type ConversationDetail = z.infer<typeof conversationDetailSchema>;

export const conversationQuoteRevisionSchema = z.object({
  id: z.string(),
  revisionNumber: z.number().int().positive(),
  status: quoteStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  totalLabel: z.string(),
  summary: z.string(),
  specs: z.array(z.object({ label: z.string(), value: z.string() })),
  lines: z.array(z.object({ label: z.string(), amountLabel: z.string() })),
  imageUrl: z.string().min(1),
  renders: quoteRevisionRendersSchema.nullable().default(null),
  selections: quoteSelectionsSchema,
  configChanges: configChangesSchema.default({}),
  communication: quoteCommunicationSchema.nullable(),
  sharedPhotosAt: z.string().nullable().default(null),
  sharedQuoteAt: z.string().nullable().default(null),
});

export type ConversationQuoteRevision = z.infer<typeof conversationQuoteRevisionSchema>;

export const conversationQuoteRequestSchema = z.object({
  quoteId: z.string().trim().min(1),
});

export const conversationQuoteSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  quoteNumber: z.number().int().positive().optional(),
  totalLabel: z.string(),
  specs: z.array(z.object({ label: z.string(), value: z.string() })),
  lines: z.array(z.object({ label: z.string(), amountLabel: z.string() })),
  imageUrl: z.string().min(1),
  selections: quoteSelectionsSchema,
  activeRevisionId: z.string(),
  status: quoteStatusSchema.default("draft"),
  revisions: z.array(conversationQuoteRevisionSchema),
});

export type ConversationQuote = z.infer<typeof conversationQuoteSchema>;

export const conversationDealOptionSchema = z.object({
  id: z.string(),
  title: z.string(),
  priceLabel: z.string(),
  stage: dealStageSchema,
  dateLabel: z.string(),
  deal: dealSchema,
  quote: conversationQuoteSchema.nullable(),
  quotes: z.array(conversationQuoteSchema).default([]),
  conversationId: z.string().optional(),
  activities: z.array(activitySchema).default([]),
});

export type ConversationDealOption = z.infer<typeof conversationDealOptionSchema>;

export const conversationDealListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  priceLabel: z.string(),
  stage: dealStageSchema,
  dateLabel: z.string(),
  createdAt: z.string(),
  conversationId: z.string().optional(),
  isNew: z.boolean().default(false),
});

export type ConversationDealListItem = z.infer<typeof conversationDealListItemSchema>;

export const customerDealsRequestSchema = z.object({
  customerId: z.string().trim().min(1),
});

export const conversationParticipantSchema = z.object({
  dealId: z.string(),
  isPrimary: z.boolean(),
  conversationId: z.string().optional(),
  customer: customerSchema,
});

export type ConversationParticipant = z.infer<typeof conversationParticipantSchema>;

export const quoteSendIdSchema = z.string().uuid();

export const sendQuoteMessagesSchema = z.object({
  quoteId: z.string().trim().min(1),
  revisionId: z.string().trim().min(1),
  dealIds: z.array(z.string().trim().min(1)).min(1),
  dealName: z.string(),
  dealPrice: z.string(),
  quoteName: z.string(),
  communication: quoteCommunicationSchema,
  sendId: quoteSendIdSchema.optional(),
});

export type SendQuoteMessages = z.infer<typeof sendQuoteMessagesSchema>;

export const syncSuggestionsSchema = z.object({
  dealId: dealIdSchema,
  conversationId: conversationIdSchema,
  positions: z.array(z.number().int().nonnegative()).max(40),
});

export const suggestionIdSchema = z.object({
  id: z.string().uuid(),
});

export const conversationSuggestionSchema = z.object({
  id: z.string().trim().min(1),
  intent: suggestionIntentSchema,
  configChanges: configChangesSchema.default({}),
  quoteNumber: z.number().int().positive().nullable().default(null),
  previewImageUrl: z.string().nullable().default(null),
  summary: z.string().default(""),
  messages: z.array(z.string()),
});

export type ConversationSuggestion = z.infer<typeof conversationSuggestionSchema>;

export const suggestionStreamEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("intent"),
    intent: suggestionIntentSchema,
    partial: z.boolean(),
  }),
  z.object({
    type: z.literal("changes"),
    intent: z.literal("revision"),
    configChanges: configChangesSchema,
    partial: z.boolean(),
  }),
  z.object({
    type: z.literal("done"),
    suggestions: z.array(conversationSuggestionSchema),
  }),
  z.object({
    type: z.literal("error"),
    error: z.string(),
  }),
]);

export type SuggestionStreamEvent = z.infer<typeof suggestionStreamEventSchema>;
