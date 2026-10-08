import { z } from "zod";

export const contactSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  phone: z.string(),
  email: z.string(),
  optedOut: z.boolean(),
});

export type Contact = z.infer<typeof contactSchema>;

export const contactWriteSchema = z.object({
  fullName: z.string(),
  phone: z.string(),
  email: z.string(),
  optedOut: z.boolean().optional(),
});

export const contactPatchSchema = z.object({
  fullName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  optedOut: z.boolean().optional(),
});

export const chatMessageSchema = z.object({
  role: z.enum(["user", "model"]),
  text: z.string(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const conversationSchema = z.object({
  id: z.string(),
  lookupKey: z.string(),
  chatId: z.string().optional(),
  crmDealId: z.string(),
  cpqQuoteId: z.string(),
  contractSent: z.boolean(),
  messages: z.array(chatMessageSchema),
});

export type Conversation = z.infer<typeof conversationSchema>;

export const conversationWriteSchema = z.object({
  lookupKey: z.string(),
  chatId: z.string().optional(),
  crmDealId: z.string(),
  cpqQuoteId: z.string(),
  contractSent: z.boolean(),
  messages: z.array(chatMessageSchema),
});

export const conversationPatchSchema = z.object({
  contractSent: z.boolean().optional(),
  messages: z.array(chatMessageSchema).optional(),
});

export const dealSourceSchema = z.enum(["quote", "yard_preview"]);
export type DealSource = z.infer<typeof dealSourceSchema>;

export const dealStatusSchema = z.enum(["open", "invoice_sent"]);
export type DealStatus = z.infer<typeof dealStatusSchema>;

export const dealSchema = z.object({
  id: z.string(),
  contactId: z.string(),
  cpqQuoteId: z.string(),
  source: dealSourceSchema,
  status: dealStatusSchema,
});

export type Deal = z.infer<typeof dealSchema>;

export const dealWriteSchema = z.object({
  contactId: z.string(),
  cpqQuoteId: z.string(),
  source: dealSourceSchema,
});

export const dealPatchSchema = z.object({
  status: dealStatusSchema.optional(),
  cpqQuoteId: z.string().optional(),
});
