import { quoteSelectionsSchema } from "@/src/features/cpq/types";
import { describeSelections } from "@/src/features/cpq/utils/pricing";
import type { QuoteStatus } from "@/src/features/crm/quotes/types";

const closedQuoteStatuses = new Set<QuoteStatus>(["voided", "expired"]);

export type DealQuotePrice = {
  id: string;
  status: QuoteStatus;
  config: unknown;
};

export function dealListValue(quotes: DealQuotePrice[]): number | null {
  const seen = new Set<string>();
  let total = 0;
  let counted = 0;

  for (const quote of quotes) {
    if (seen.has(quote.id) || closedQuoteStatuses.has(quote.status)) continue;
    seen.add(quote.id);
    const config = quoteSelectionsSchema.safeParse(quote.config);
    if (!config.success) continue;
    total += describeSelections(config.data).estimate.total;
    counted += 1;
  }

  return counted === 0 ? null : total;
}
