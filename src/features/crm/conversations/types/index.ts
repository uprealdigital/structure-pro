import { z } from "zod";
import { quoteSelectionsSchema } from "@/src/features/cpq/types";
import { customerSchema } from "@/src/features/crm/common/types";
import { dealSchema, dealSourceSchema, dealStageSchema, dealStatusSchema } from "@/src/features/crm/deals/types";

export const activityChannelSchema = z.enum([
  "call",
  "sms",
  "facebook",
  "email",
  "telegram",
]);

export type ActivityChannel = z.infer<typeof activityChannelSchema>;

export const generatedBySchema = z.enum(["ai", "manual"]);
export type GeneratedBy = z.infer<typeof generatedBySchema>;

export const composerChannelSchema = z.enum(["sms", "facebook", "email"]);
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
  role: z.enum(["user", "model"]),
  text: z.string(),
  channel: activityChannelSchema,
  generatedBy: generatedBySchema,
  createdAt: z.string().optional(),
  call: callSchema.optional(),
});

export type Activity = z.infer<typeof activitySchema>;

export const activityInsertSchema = z
  .object({
    role: z.enum(["user", "model"]),
    text: z.string(),
    channel: activityChannelSchema,
    generatedBy: generatedBySchema.default("manual"),
    createdAt: z.string().optional(),
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
  chatId: z.string().optional(),
  customerId: z.string(),
  contractSent: z.boolean(),
  createdAt: z.string().optional(),
  activities: z.array(activitySchema),
});

export type Conversation = z.infer<typeof conversationSchema>;

export const conversationIdSchema = z.string().trim().min(1);

export const conversationWriteSchema = z.object({
  lookupKey: z.string(),
  chatId: z.string().optional(),
  customerId: z.string(),
  contractSent: z.boolean(),
  activities: z.array(activityInsertSchema),
});

export const conversationPatchSchema = z.object({
  contractSent: z.boolean().optional(),
});

export const conversationSummarySchema = z.object({
  id: z.string(),
  lookupKey: z.string(),
  chatId: z.string().optional(),
  customerId: z.string(),
  contractSent: z.boolean(),
  updatedAt: z.string(),
});

export type ConversationSummary = z.infer<typeof conversationSummarySchema>;

export const conversationInboxItemSchema = z.object({
  id: z.string(),
  updatedAt: z.string(),
  preview: z.string(),
  contactName: z.string(),
  contactPhone: z.string(),
  contactEmail: z.string(),
  dealId: z.string(),
  dealStatus: dealStatusSchema,
  dealStatuses: z.array(
    z.object({
      id: z.string(),
      status: dealStatusSchema,
    }),
  ),
  dealSource: dealSourceSchema,
  contractSent: z.boolean(),
});

export type ConversationInboxItem = z.infer<typeof conversationInboxItemSchema>;

export const quoteRevisionViewStatusSchema = z.enum(["draft", "sent"]);

export const conversationQuoteRevisionSchema = z.object({
  id: z.string(),
  revisionNumber: z.number().int().positive(),
  status: quoteRevisionViewStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  totalLabel: z.string(),
  summary: z.string(),
  specs: z.array(z.object({ label: z.string(), value: z.string() })),
  lines: z.array(z.object({ label: z.string(), amountLabel: z.string() })),
  imageUrl: z.string().min(1),
  selections: quoteSelectionsSchema,
});

export type ConversationQuoteRevision = z.infer<typeof conversationQuoteRevisionSchema>;

export const conversationQuoteSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  totalLabel: z.string(),
  specs: z.array(z.object({ label: z.string(), value: z.string() })),
  lines: z.array(z.object({ label: z.string(), amountLabel: z.string() })),
  imageUrl: z.string().min(1),
  selections: quoteSelectionsSchema,
  activeRevisionId: z.string(),
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
});

export type ConversationDealOption = z.infer<typeof conversationDealOptionSchema>;

export const conversationWorkspaceSchema = z.object({
  id: z.string(),
  contractSent: z.boolean(),
  customer: customerSchema,
  deal: dealSchema,
  deals: z.array(conversationDealOptionSchema),
  createdAt: z.string(),
  activities: z.array(activitySchema),
  quote: conversationQuoteSchema.nullable(),
});

export type ConversationWorkspace = z.infer<typeof conversationWorkspaceSchema>;
