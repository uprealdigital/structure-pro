import { z } from "zod";
import { quoteSelectionsSchema } from "@/src/features/cpq/types";

export const quoteStatusSchema = z.enum(["draft", "sent", "contract"]);
export type QuoteStatus = z.infer<typeof quoteStatusSchema>;

export const quoteCustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type QuoteCustomer = z.infer<typeof quoteCustomerSchema>;

export const quoteListItemSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  createdAt: z.string(),
  dealLabel: z.string(),
  zip: z.string(),
  customers: z.array(quoteCustomerSchema),
  priceLabel: z.string(),
  monthlyLabel: z.string(),
  status: quoteStatusSchema,
});

export type QuoteListItem = z.infer<typeof quoteListItemSchema>;

export const quoteRevisionStatusSchema = z.enum(["draft", "sent"]);
export type QuoteRevisionStatus = z.infer<typeof quoteRevisionStatusSchema>;

export const quoteRevisionWriteSchema = z.object({
  quoteId: z.string().trim().min(1),
  selections: quoteSelectionsSchema,
  status: quoteRevisionStatusSchema.default("draft"),
});

export const quoteRevisionPatchSchema = z.object({
  status: quoteRevisionStatusSchema,
});

export const quoteRevisionActivateSchema = z.object({
  quoteId: z.string().trim().min(1),
  revisionId: z.string().trim().min(1),
});

export const quoteRevisionSchema = z.object({
  id: z.string().min(1),
  quoteId: z.string().min(1),
  revisionNumber: z.number().int().positive(),
  status: quoteRevisionStatusSchema,
  selections: quoteSelectionsSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type QuoteRevision = z.infer<typeof quoteRevisionSchema>;
