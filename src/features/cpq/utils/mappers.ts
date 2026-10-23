import {
  buildingConfigSchema,
  quoteRecordSchema,
  quoteSelectionsSchema,
  storedConfigurationSchema,
  type ListedQuote,
  type QuoteSelections,
  type BuildingConfig,
  type StoredConfiguration,
} from "@/src/features/cpq/types";
import { quoteNumberValue } from "@/src/features/crm/quotes/utils/formatting";

export function toBuildingConfig(selections: QuoteSelections): BuildingConfig {
  return buildingConfigSchema.parse(selections);
}

export type QuoteListRow = {
  id: string;
  invoice_id: string;
  quote_number?: unknown;
  selections: unknown;
  created_at?: string | null;
};

export function toListedQuote(row: QuoteListRow): ListedQuote | undefined {
  const selections = quoteSelectionsSchema.safeParse(row.selections);
  if (!selections.success) return undefined;
  const quoteNumber = quoteNumberValue(row.quote_number);
  const quote = quoteRecordSchema.safeParse({
    id: row.id,
    invoiceId: row.invoice_id,
    ...(quoteNumber ? { quoteNumber } : {}),
    selections: selections.data,
  });
  if (!quote.success) return undefined;
  return {
    ...quote.data,
    createdAt: typeof row.created_at === "string" ? row.created_at : "",
  };
}

export function toStoredConfiguration(
  selections: QuoteSelections,
  lng: string,
): StoredConfiguration {
  return storedConfigurationSchema.parse({ ...selections, lng });
}
