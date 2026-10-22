import { z } from "zod";
import { quoteSelectionsSchema } from "@/src/features/cpq/types";
import { customerSchema } from "@/src/features/crm/common/types";

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

export const quoteCommunicationSchema = z.object({
  subject: z.string(),
  emailBody: z.string(),
  smsBody: z.string(),
  emailRecipientIds: z.array(z.string()),
  smsRecipientIds: z.array(z.string()),
});

export type QuoteCommunication = z.infer<typeof quoteCommunicationSchema>;

export const quoteRevisionWriteSchema = z.object({
  quoteId: z.string().trim().min(1),
  selections: quoteSelectionsSchema,
  status: quoteRevisionStatusSchema.default("draft"),
});

export const quoteRevisionPatchSchema = z.object({
  status: quoteRevisionStatusSchema,
});

export const quoteCommunicationWriteSchema = z.object({
  revisionId: z.string().trim().min(1),
  communication: quoteCommunicationSchema,
});

export const quoteRevisionActivateSchema = z.object({
  quoteId: z.string().trim().min(1),
  revisionId: z.string().trim().min(1),
});

export const createDealQuoteSchema = z.object({
  dealId: z.string().trim().min(1),
  selections: quoteSelectionsSchema,
});

export const quoteRevisionSchema = z.object({
  id: z.string().min(1),
  quoteId: z.string().min(1),
  revisionNumber: z.number().int().positive(),
  status: quoteRevisionStatusSchema,
  selections: quoteSelectionsSchema,
  communication: quoteCommunicationSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type QuoteRevision = z.infer<typeof quoteRevisionSchema>;

export const quotePortalModeSchema = z.enum(["internal", "external"]);
export type QuotePortalMode = z.infer<typeof quotePortalModeSchema>;

export const quotePortalStatusSchema = z.enum([
  "draft",
  "sent",
  "viewed",
  "signed",
  "deposit_paid",
  "expired",
]);
export type QuotePortalStatus = z.infer<typeof quotePortalStatusSchema>;

export const quotePortalLineSchema = z.object({
  label: z.string(),
  amountLabel: z.string(),
});

export const quotePortalDetailSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const quotePortalCustomerSchema = quoteCustomerSchema.extend({
  primary: z.boolean(),
});

export type QuotePortalCustomer = z.infer<typeof quotePortalCustomerSchema>;

export const quotePortalRecipientSchema = z.object({
  dealId: z.string(),
  isPrimary: z.boolean(),
  customer: customerSchema,
});

export type QuotePortalRecipient = z.infer<typeof quotePortalRecipientSchema>;

export const quotePortalSchema = z.object({
  id: z.string().min(1),
  invoiceId: z.string().min(1),
  revisionId: z.string().min(1),
  dealName: z.string().min(1),
  versionLabel: z.string().min(1),
  dateLabel: z.string(),
  imageUrl: z.string().min(1),
  monthlyLabel: z.string(),
  monthsLabel: z.string(),
  lines: z.array(quotePortalLineSchema),
  details: z.array(quotePortalDetailSchema),
  totalLabel: z.string(),
  zip: z.string(),
  won: z.boolean(),
  customers: z.array(quotePortalCustomerSchema),
  recipients: z.array(quotePortalRecipientSchema),
  dealIds: z.array(z.string()),
  selections: quoteSelectionsSchema,
  communication: quoteCommunicationSchema.nullable(),
  status: quotePortalStatusSchema,
});

export type QuotePortal = z.infer<typeof quotePortalSchema>;

export const payQuoteDepositSchema = z.object({
  quoteId: z.string().trim().min(1),
});
