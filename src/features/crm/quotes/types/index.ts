import { z } from "zod";
import { quoteSelectionsSchema } from "@/src/features/cpq/types";
import { customerSchema } from "@/src/features/crm/common/types";

export const quoteStatusSchema = z.enum([
  "draft",
  "sent",
  "viewed",
  "changes_requested",
  "signed",
  "deposit_paid",
  "expired",
  "voided",
]);
export type QuoteStatus = z.infer<typeof quoteStatusSchema>;

export const quoteRecordStatusSchema = quoteStatusSchema;
export type QuoteRecordStatus = QuoteStatus;

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

export const quoteRevisionStatusSchema = quoteStatusSchema;
export type QuoteRevisionStatus = QuoteStatus;

export const quoteCommunicationSchema = z.object({
  subject: z.string(),
  emailBody: z.string(),
  smsBody: z.string(),
  emailRecipientIds: z.array(z.string()),
  smsRecipientIds: z.array(z.string()),
});

export type QuoteCommunication = z.infer<typeof quoteCommunicationSchema>;

export const configChangesSchema = quoteSelectionsSchema.partial();
export type ConfigChanges = z.infer<typeof configChangesSchema>;

export const quoteRevisionWriteSchema = z.object({
  quoteId: z.string().trim().min(1),
  selections: quoteSelectionsSchema,
  status: quoteRevisionStatusSchema.default("draft"),
});

export const quoteRevisionPatchSchema = z.object({
  status: quoteRevisionStatusSchema,
  sharedQuoteAt: z.string().min(1).optional(),
});

export const quoteRevisionPhotosShareSchema = z.object({
  revisionId: z.string().trim().min(1),
  sharedPhotosAt: z.string().min(1),
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
  conversationId: z.string().trim().min(1).optional(),
});

export const duplicateQuoteSchema = z.object({
  dealId: z.string().trim().min(1),
  quoteId: z.string().trim().min(1),
  revisionId: z.string().trim().min(1).optional(),
  conversationId: z.string().trim().min(1).optional(),
});

export const cancelQuoteSchema = z.object({
  quoteId: z.string().trim().min(1),
});

export const quoteRevisionRendersSchema = z.object({
  render_full_url: z.string().url(),
  render_medium_url: z.string().url(),
  render_small_url: z.string().url(),
});

export type QuoteRevisionRenders = z.infer<typeof quoteRevisionRendersSchema>;

const maxRenderBytes = 8 * 1024 * 1024;

export const quoteRevisionRenderFileSchema = z
  .instanceof(Blob)
  .refine((file) => file.size > 0 && file.size <= maxRenderBytes, "A render image is required");

export const quoteRevisionRenderFilesSchema = z.object({
  full: quoteRevisionRenderFileSchema,
  medium: quoteRevisionRenderFileSchema,
  small: quoteRevisionRenderFileSchema,
});

export type QuoteRevisionRenderFiles = z.infer<typeof quoteRevisionRenderFilesSchema>;

export const quoteRevisionSchema = z.object({
  id: z.string().min(1),
  quoteId: z.string().min(1),
  revisionNumber: z.number().int().positive(),
  status: quoteRevisionStatusSchema,
  selections: quoteSelectionsSchema,
  configChanges: configChangesSchema.default({}),
  communication: quoteCommunicationSchema.nullable(),
  renders: quoteRevisionRendersSchema.nullable().default(null),
  sharedPhotosAt: z.string().nullable().default(null),
  sharedQuoteAt: z.string().nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type QuoteRevision = z.infer<typeof quoteRevisionSchema>;

export const quotePortalModeSchema = z.enum(["internal", "external"]);
export type QuotePortalMode = z.infer<typeof quotePortalModeSchema>;

export const quotePortalStatusSchema = quoteStatusSchema;
export type QuotePortalStatus = QuoteStatus;

export const quoteLifecycleSchema = z.object({
  quoteId: z.string().trim().min(1),
  openedByCustomer: z.boolean().default(false),
});

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
  renders: quoteRevisionRendersSchema.nullable().default(null),
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
  quoteCount: z.number().int().nonnegative(),
  selections: quoteSelectionsSchema,
  communication: quoteCommunicationSchema.nullable(),
  status: quotePortalStatusSchema,
});

export type QuotePortal = z.infer<typeof quotePortalSchema>;

export const payQuoteDepositSchema = z.object({
  quoteId: z.string().trim().min(1),
});
