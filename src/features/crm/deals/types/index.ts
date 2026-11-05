import { z } from "zod";
import { quoteStatusSchema } from "@/src/features/crm/quotes/types";

export const dealSourceSchema = z.enum(["quote", "yard_preview", "walk_in"]);
export type DealSource = z.infer<typeof dealSourceSchema>;

export const dealStatusSchema = z.enum([
  "new_lead",
  "active_quote",
  "pending_deposit",
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

export const walkInDealSchema = z.object({
  fullName: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  email: z.string().trim().pipe(z.email()),
});

export type WalkInDealInput = z.infer<typeof walkInDealSchema>;

export const dealPatchSchema = z.object({
  status: dealStatusSchema.optional(),
  quoteId: z.string().trim().min(1).nullable().optional(),
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

export const dealListCustomerSchema = z.object({
  id: z.string(),
  full_name: z.string(),
});

export type DealListCustomer = z.infer<typeof dealListCustomerSchema>;

export const dealListQuoteRevisionSchema = z.object({
  id: z.string(),
  revision_number: z.number(),
  status: quoteStatusSchema,
});

export type DealListQuoteRevision = z.infer<typeof dealListQuoteRevisionSchema>;

export const dealListQuoteSchema = z.object({
  id: z.string(),
  quote_number: z.number(),
  status: quoteStatusSchema,
  quote_revision: dealListQuoteRevisionSchema.nullable(),
});

export type DealListQuote = z.infer<typeof dealListQuoteSchema>;

export const dealListItemSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  source: dealSourceSchema,
  status: dealStatusSchema,
  customers: z.array(dealListCustomerSchema),
  quote: dealListQuoteSchema.nullable(),
  value: z.number().nullable(),
});

export type DealListItem = z.infer<typeof dealListItemSchema>;

export const dealNameContextSchema = z.object({
  source: z.string(),
  createdAt: z.string(),
  number: z.number().int().positive(),
});

export type DealNameContext = z.infer<typeof dealNameContextSchema>;

export const dealChangeKindSchema = z.enum(["insert", "update", "delete"]);
export type DealChangeKind = z.infer<typeof dealChangeKindSchema>;

export const dealChangeEventSchema = z.object({
  id: z.string().min(1),
  kind: dealChangeKindSchema,
  status: dealStatusSchema.optional(),
  updatedAt: z.string().optional(),
});

export type DealChangeEvent = z.infer<typeof dealChangeEventSchema>;
