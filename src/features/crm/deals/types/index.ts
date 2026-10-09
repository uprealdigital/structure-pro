import { z } from "zod";

export const dealSourceSchema = z.enum(["quote", "yard_preview"]);
export type DealSource = z.infer<typeof dealSourceSchema>;

export const dealStatusSchema = z.enum(["open", "invoice_sent"]);
export type DealStatus = z.infer<typeof dealStatusSchema>;

export const dealSchema = z.object({
  id: z.string(),
  quoteId: z.string(),
  source: dealSourceSchema,
  status: dealStatusSchema,
});

export type Deal = z.infer<typeof dealSchema>;

export const dealWriteSchema = z.object({
  quoteId: z.string(),
  source: dealSourceSchema,
});

export const dealPatchSchema = z.object({
  status: dealStatusSchema.optional(),
  quoteId: z.string().optional(),
});

export const dealStageSchema = z.enum([
  "new_lead",
  "configured",
  "quote_sent",
  "contract",
  "won",
  "lost",
]);

export type DealStage = z.infer<typeof dealStageSchema>;

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
