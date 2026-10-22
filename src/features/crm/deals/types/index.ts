import { z } from "zod";

export const dealSourceSchema = z.enum(["quote", "yard_preview"]);
export type DealSource = z.infer<typeof dealSourceSchema>;

export const dealStatusSchema = z.enum([
  "lead",
  "quote_sent",
  "quote_viewed",
  "partially_signed",
  "deal_won",
  "deal_lost",
]);
export type DealStatus = z.infer<typeof dealStatusSchema>;

export const dealIdSchema = z.string().trim().min(1);

export const dealNameMaxLength = 75;

export const dealNameSchema = z.string().trim().min(1).max(dealNameMaxLength);

export const dealSchema = z.object({
  id: z.string(),
  quoteId: z.string(),
  source: dealSourceSchema,
  status: dealStatusSchema,
  previousStatus: dealStatusSchema.nullable(),
  name: z.string().nullable(),
  viewedAt: z.string().nullable().default(null),
  createdAt: z.string().optional(),
});

export type Deal = z.infer<typeof dealSchema>;

export const dealWriteSchema = z.object({
  quoteId: z.string(),
  source: dealSourceSchema,
});

export const dealPatchSchema = z.object({
  status: dealStatusSchema.optional(),
  quoteId: z.string().optional(),
  name: dealNameSchema.optional(),
  viewedAt: z.string().nullable().optional(),
});

export const dealQuoteLinkSchema = z.object({
  dealId: z.string().trim().min(1),
  quoteId: z.string().trim().min(1),
});

export type DealQuoteLink = z.infer<typeof dealQuoteLinkSchema>;

export const dealStageSchema = dealStatusSchema;

export type DealStage = DealStatus;

export const dealBoardItemSchema = z.object({
  id: z.string(),
  conversationId: z.string().optional(),
  contactName: z.string(),
  productName: z.string(),
  detail: z.string(),
  source: dealSourceSchema,
  stage: dealStageSchema,
  valueLabel: z.string(),
});

export type DealBoardItem = z.infer<typeof dealBoardItemSchema>;
