import { quotePriceWindowDays } from "@/src/features/crm/quotes/config/status";
import type { QuoteStatus } from "@/src/features/crm/quotes/types";

const openWindow = new Set<QuoteStatus>(["sent", "viewed", "changes_requested"]);
const windowMs = quotePriceWindowDays * 24 * 60 * 60 * 1000;

export function quoteWindowExpired(
  status: QuoteStatus,
  sharedQuoteAt: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!openWindow.has(status) || !sharedQuoteAt) return false;
  const shared = new Date(sharedQuoteAt).getTime();
  if (Number.isNaN(shared)) return false;
  return now - shared >= windowMs;
}
