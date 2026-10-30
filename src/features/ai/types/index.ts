import { z } from "zod";
import { logLevelSchema } from "@/src/common/utils/log-level";

export const chatMessageSchema = z.object({
  role: z.enum(["user", "model"]),
  text: z.string(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const agentSessionSchema = z.object({
  fullName: z.string(),
  phone: z.string(),
  email: z.string(),
  chatId: z.string().optional(),
  invoiceId: z.string(),
  quoteId: z.string(),
  crmDealId: z.string(),
  crmCustomerId: z.string(),
  specLines: z.string(),
  total: z.number(),
  brandName: z.string(),
  messages: z.array(chatMessageSchema),
  contractSent: z.boolean(),
});

export type AgentSession = z.infer<typeof agentSessionSchema>;

export const inboundActivityChannelSchema = z.enum(["sms", "telegram"]);

export type InboundActivityChannel = z.infer<typeof inboundActivityChannelSchema>;

export const inboundActivitySchema = z.object({
  channel: inboundActivityChannelSchema,
  channelKey: z.string().trim().min(1),
  text: z.string(),
});

export type InboundActivity = z.infer<typeof inboundActivitySchema>;

export const yardPreviewEventSchema = z.object({
  at: z.string(),
  step: z.string(),
  detail: z.string().optional(),
});

export type YardPreviewEvent = z.infer<typeof yardPreviewEventSchema>;

export const yardPreviewStatusSchema = z.enum(["accepted", "emailed", "failed"]);

export type YardPreviewStatus = z.infer<typeof yardPreviewStatusSchema>;

export const yardPreviewSchema = z.object({
  id: z.string(),
  crmCustomerId: z.string(),
  crmDealId: z.string(),
  status: yardPreviewStatusSchema,
  error: z.string().nullable(),
});

export type YardPreview = z.infer<typeof yardPreviewSchema>;

export const yardPreviewWriteSchema = z.object({
  crmCustomerId: z.string(),
  crmDealId: z.string(),
  events: z.array(yardPreviewEventSchema),
});

export const inboundIntentKindSchema = z.enum(["configuration", "quote_request"]);

export type InboundIntentKind = z.infer<typeof inboundIntentKindSchema>;

export const suggestionConfigValueSchema = z.union([z.string(), z.number(), z.boolean()]);

export type SuggestionConfigValue = z.infer<typeof suggestionConfigValueSchema>;

export const suggestionConfigChangesSchema = z.object({
  styleId: z.string().optional(),
  width: z.number().optional(),
  length: z.number().optional(),
  height: z.number().optional(),
  sidingTypeId: z.string().optional(),
  roofTypeId: z.string().optional(),
  sidingColorId: z.string().optional(),
  trimColorId: z.string().optional(),
  roofColorId: z.string().optional(),
  shutterColorId: z.string().optional(),
  flooringId: z.string().optional(),
  hasLoft: z.boolean().optional(),
  hasWindow: z.boolean().optional(),
  hasVent: z.boolean().optional(),
  doorStyle: z.enum(["single", "double", "none"]).optional(),
  wallFace: z.enum(["front", "left", "back", "right"]).optional(),
  zip: z.string().optional(),
});

export type SuggestionConfigChanges = z.infer<typeof suggestionConfigChangesSchema>;

export const inboundIntentSchema = z.object({
  kind: inboundIntentKindSchema,
  summary: z.string(),
  configChanges: z.record(z.string(), suggestionConfigValueSchema),
  quoteNumber: z.number().int().positive().nullable(),
  messageIndexes: z.array(z.number().int().nonnegative()),
});

export type InboundIntent = z.infer<typeof inboundIntentSchema>;

export const inboundIntentResultSchema = z.object({
  intents: z
    .array(
      z.object({
        kind: z.enum(["configuration", "quote_request", "none"]),
        summary: z.string().optional(),
        configChanges: z.record(z.string(), suggestionConfigValueSchema).optional(),
        quoteNumber: z.number().int().positive().nullable().optional(),
        messageIndexes: z.array(z.number()).optional(),
      }),
    )
    .optional(),
});

export const suggestionIntentSchema = z.enum(["revision", "new_quote"]);

export type SuggestionIntent = z.infer<typeof suggestionIntentSchema>;

export const suggestionStatusSchema = z.enum(["pending", "applied", "dismissed"]);

export type SuggestionStatus = z.infer<typeof suggestionStatusSchema>;

export const suggestionSchema = z.object({
  id: z.string(),
  dealId: z.string(),
  messageIds: z.array(z.number().int().positive()),
  intent: suggestionIntentSchema,
  status: suggestionStatusSchema,
  configChanges: suggestionConfigChangesSchema,
  quoteNumber: z.number().int().positive().nullable(),
  previewImageUrl: z.string().nullable(),
  createdAt: z.string(),
});

export type Suggestion = z.infer<typeof suggestionSchema>;

export const suggestionWriteSchema = z.object({
  dealId: z.string().trim().min(1),
  messageIds: z.array(z.number().int().positive()).min(1).max(40),
  intent: suggestionIntentSchema,
  configChanges: suggestionConfigChangesSchema,
  quoteNumber: z.number().int().positive().nullable().optional(),
});

export const suggestionPatchSchema = z.object({
  messageIds: z.array(z.number().int().positive()).min(1).max(40).optional(),
  configChanges: suggestionConfigChangesSchema.optional(),
  quoteNumber: z.number().int().positive().nullable().optional(),
  previewImageUrl: z.string().nullable().optional(),
  status: z.enum(["pending", "applied", "dismissed"]).optional(),
});

export const dealSummaryCustomerSchema = z.object({
  name: z.string(),
  phone: z.string(),
  email: z.string(),
  primary: z.boolean(),
});

export const dealSummaryRevisionSchema = z.object({
  name: z.string(),
  status: z.string(),
  total: z.string(),
  summary: z.string(),
  active: z.boolean(),
});

export const dealSummaryQuoteSchema = z.object({
  name: z.string(),
  status: z.string(),
  revisions: z.array(dealSummaryRevisionSchema).max(30),
});

export const dealSummaryActivitySchema = z.object({
  at: z.string().optional(),
  channel: z.string(),
  speaker: z.string(),
  text: z.string(),
});

export const dealSummaryRequestSchema = z.object({
  dealName: z.string(),
  status: z.string(),
  source: z.string(),
  customers: z.array(dealSummaryCustomerSchema).max(20),
  quotes: z.array(dealSummaryQuoteSchema).max(20),
  activities: z.array(dealSummaryActivitySchema).max(80),
  earlierActivityCount: z.number().int().nonnegative(),
});

export type DealSummaryRequest = z.infer<typeof dealSummaryRequestSchema>;

export const aiActivityStatusSchema = z.enum(["detected", "none", "error"]);

export type AiActivityStatus = z.infer<typeof aiActivityStatusSchema>;

export const aiActivityLogSchema = z.object({
  id: z.string(),
  dealId: z.string().nullable(),
  activityIds: z.array(z.number().int().positive()),
  feature: z.string(),
  promptPayload: z.unknown(),
  model: z.string().nullable(),
  rawResponse: z.string().nullable(),
  parsedResponse: z.unknown(),
  status: aiActivityStatusSchema,
  logLevel: logLevelSchema,
  errorMessage: z.string().nullable(),
  executionTimeMs: z.number().int().nonnegative(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});

export type AiActivityLog = z.infer<typeof aiActivityLogSchema>;

export const aiActivityLogWriteSchema = z.object({
  dealId: z.string().uuid().nullable(),
  activityIds: z.array(z.number().int().positive()).max(40),
  feature: z.string().trim().min(1),
  promptPayload: z.unknown(),
  model: z.string().trim().min(1).nullable(),
  rawResponse: z.string().nullable(),
  parsedResponse: z.unknown(),
  status: aiActivityStatusSchema,
  logLevel: logLevelSchema,
  errorMessage: z.string().nullable(),
  executionTimeMs: z.number().int().nonnegative(),
});

export type AiActivityLogWrite = z.infer<typeof aiActivityLogWriteSchema>;

export const yardPreviewPatchSchema = z.object({
  status: yardPreviewStatusSchema.optional(),
  error: z.string().nullable().optional(),
  events: z.array(yardPreviewEventSchema).optional(),
  yardPhotoPath: z.string().optional(),
  buildingRenderPath: z.string().optional(),
  previewPath: z.string().optional(),
});
