import { z } from "zod";

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
  cpqQuoteId: z.string(),
  crmDealId: z.string(),
  crmContactId: z.string(),
  specLines: z.string(),
  total: z.number(),
  brandName: z.string(),
  messages: z.array(chatMessageSchema),
  contractSent: z.boolean(),
});

export type AgentSession = z.infer<typeof agentSessionSchema>;

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
  crmContactId: z.string(),
  crmDealId: z.string(),
  status: yardPreviewStatusSchema,
  error: z.string().nullable(),
});

export type YardPreview = z.infer<typeof yardPreviewSchema>;

export const yardPreviewWriteSchema = z.object({
  crmContactId: z.string(),
  crmDealId: z.string(),
  events: z.array(yardPreviewEventSchema),
});

export const yardPreviewPatchSchema = z.object({
  status: yardPreviewStatusSchema.optional(),
  error: z.string().nullable().optional(),
  events: z.array(yardPreviewEventSchema).optional(),
  yardPhotoPath: z.string().optional(),
  buildingRenderPath: z.string().optional(),
  previewPath: z.string().optional(),
});
