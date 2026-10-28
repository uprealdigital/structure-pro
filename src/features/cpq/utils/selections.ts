import { quoteSelectionsSchema, type QuoteSelections } from "@/src/features/cpq/types";

const quoteSelectionKeys = Object.keys(quoteSelectionsSchema.shape) as (keyof QuoteSelections)[];

export function sameQuoteSelections(left: QuoteSelections, right: QuoteSelections): boolean {
  return quoteSelectionKeys.every((key) => left[key] === right[key]);
}
