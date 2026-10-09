import { z } from "zod";

export const CONFIGURATION_ID = /^[a-f0-9]{32}$/;
export const LOCALE_CODE = /^[a-z]{2}(?:-[A-Z]{2})?$/;

export const configurationIdSchema = z.string().regex(CONFIGURATION_ID);
export const localeCodeSchema = z.string().trim().regex(LOCALE_CODE);

export const buildingConfigSchema = z.object({
  styleId: z.string(),
  width: z.number(),
  length: z.number(),
  height: z.number(),
  sidingTypeId: z.string(),
  roofTypeId: z.string(),
  sidingColorId: z.string(),
  trimColorId: z.string(),
  roofColorId: z.string(),
  shutterColorId: z.string(),
  flooringId: z.string(),
  hasLoft: z.boolean(),
  hasWindow: z.boolean(),
  hasVent: z.boolean(),
  doorStyle: z.enum(["single", "double", "none"]),
  wallFace: z.enum(["front", "left", "back", "right"]),
});

export const quoteSelectionsSchema = buildingConfigSchema.extend({
  zip: z.string().trim().min(1, "ZIP code is required"),
});

/** Same shape as src/features/cpq/config/default-config.json. */
export const storedConfigurationSchema = quoteSelectionsSchema.extend({
  lng: localeCodeSchema,
});

export type BuildingConfig = z.infer<typeof buildingConfigSchema>;
export type QuoteSelections = z.infer<typeof quoteSelectionsSchema>;
export type StoredConfiguration = z.infer<typeof storedConfigurationSchema>;

export const quoteContactSchema = z.object({
  fullName: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  email: z.string().trim().pipe(z.email()),
});

export type QuoteContact = z.infer<typeof quoteContactSchema>;

export const quoteRecordSchema = z.object({
  id: z.string().min(1),
  invoiceId: z.string().min(1),
  selections: quoteSelectionsSchema,
});

export type QuoteRecord = z.infer<typeof quoteRecordSchema>;

export type ListedQuote = QuoteRecord & {
  createdAt: string;
};

export type QuoteSummary = {
  text: string;
  total: number;
  totalLabel: string;
  specs: { label: string; value: string }[];
  lines: { label: string; amountLabel: string }[];
  imageUrl: string;
  brand: { name: string; region: string; mark: string };
};

export type CpqQuote = QuoteRecord & {
  summary: QuoteSummary;
};

export type SavedConfiguration = {
  id: string;
  selections: StoredConfiguration;
};
