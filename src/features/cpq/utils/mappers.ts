import {
  buildingConfigSchema,
  cpqLogSchema,
  quoteRecordSchema,
  quoteSelectionsSchema,
  storedConfigurationSchema,
  type BuildingConfig,
  type CpqLog,
  type ListedQuote,
  type QuoteSelections,
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

export type CpqLogRow = {
  id: string;
  feature: string;
  raw_response: string | null;
  parsed_response: unknown;
  status: string;
  error_message: string | null;
  read_at: string | null;
  created_at: string;
};

function jsonField(value: unknown): unknown {
  if (value == null) return null;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

export function toCpqLog(row: CpqLogRow): CpqLog | undefined {
  const log = cpqLogSchema.safeParse({
    id: row.id,
    feature: row.feature,
    rawResponse: row.raw_response,
    parsedResponse: jsonField(row.parsed_response),
    status: row.status,
    errorMessage: row.error_message,
    readAt: row.read_at,
    createdAt: row.created_at,
  });
  return log.success ? log.data : undefined;
}
