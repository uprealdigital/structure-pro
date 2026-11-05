import { z } from "zod";
import { quoteSelectionsSchema } from "@/src/features/cpq/types";

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

export const quoteListCustomerSchema = z.object({
  id: z.string(),
  full_name: z.string(),
});

export type QuoteListCustomer = z.infer<typeof quoteListCustomerSchema>;

export const quoteListDealSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  customers: z.array(quoteListCustomerSchema),
});

export type QuoteListDeal = z.infer<typeof quoteListDealSchema>;

export const quoteListRevisionSchema = z.object({
  id: z.string(),
  revision_number: z.number(),
  status: quoteStatusSchema,
  config: quoteSelectionsSchema,
});

export type QuoteListRevision = z.infer<typeof quoteListRevisionSchema>;

export const quoteListItemSchema = z.object({
  id: z.string(),
  invoice_id: z.string(),
  quote_number: z.number(),
  status: quoteStatusSchema,
  created_at: z.string(),
  quote_revision: quoteListRevisionSchema.nullable(),
  deals: z.array(quoteListDealSchema),
  deal_quotes: z.array(z.object({ deal: quoteListDealSchema })),
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

const quotePortalDealStatusSchema = z.enum([
  "new_lead",
  "active_quote",
  "pending_deposit",
  "deal_won",
  "deal_lost",
]);

export const quotePortalCustomerSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  phone: z.string(),
  email: z.string(),
  opted_out: z.boolean(),
  active_deal_id: z.string().nullable(),
  created_at: z.string(),
});

export type QuotePortalCustomer = z.infer<typeof quotePortalCustomerSchema>;

export const quotePortalDealSchema = z.object({
  id: z.string(),
  quote_id: z.string().nullable(),
  status: quotePortalDealStatusSchema,
  name: z.string().nullable(),
  deal_customers: z.array(
    z.object({
      is_primary: z.boolean(),
      customer: quotePortalCustomerSchema,
    }),
  ),
  deal_quotes: z.array(z.object({ quote_id: z.string() })),
});

export const quotePortalRevisionSchema = z.object({
  id: z.string(),
  revision_number: z.number().int().positive(),
  status: quoteStatusSchema,
  config: quoteSelectionsSchema,
  communication: quoteCommunicationSchema.nullable(),
  renders: quoteRevisionRendersSchema.nullable(),
  created_at: z.string(),
});

export const quotePortalSchema = z.object({
  id: z.string(),
  invoice_id: z.string(),
  quote_number: z.number().int().positive(),
  status: quoteStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
  quote_revision: quotePortalRevisionSchema.nullable(),
  deals: z.array(quotePortalDealSchema),
  deal_quotes: z.array(z.object({ deal: quotePortalDealSchema })),
});

export type QuotePortal = z.infer<typeof quotePortalSchema>;

export type LoadedQuotePortal = QuotePortal & {
  quote_revision: NonNullable<QuotePortal["quote_revision"]>;
};

export const payQuoteDepositSchema = z.object({
  quoteId: z.string().trim().min(1),
});

export const quoteChangeKindSchema = z.enum(["insert", "update", "delete"]);
export type QuoteChangeKind = z.infer<typeof quoteChangeKindSchema>;

export const quoteChangeEventSchema = z.object({
  id: z.string().min(1),
  kind: quoteChangeKindSchema,
  status: quoteStatusSchema.optional(),
  activeRevisionId: z.string().min(1).nullable().optional(),
  updatedAt: z.string().optional(),
  dealIds: z.array(z.string()).default([]),
});

export type QuoteChangeEvent = z.infer<typeof quoteChangeEventSchema>;
