import "server-only";

import { readConfiguration } from "@/src/features/cpq/db/configuration";
import { readQuote } from "@/src/features/cpq/db/quote";
import { configurationIdSchema } from "@/src/features/cpq/types";
import { CATALOG } from "@/src/features/cpq/utils/catalog";
import { priceSummary } from "@/src/features/cpq/utils/pricing";

export function getCatalog() {
  return CATALOG;
}

export async function getConfiguration(id: string) {
  if (!configurationIdSchema.safeParse(id).success) return undefined;
  return readConfiguration(id);
}

export async function getQuoteForPage(id: string) {
  const quote = await readQuote(id);
  if (!quote) return undefined;
  return { ...quote, summary: priceSummary(quote.selections) };
}
