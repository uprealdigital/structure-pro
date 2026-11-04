import { copy } from "@/src/features/crm/common/locales/en";
import { QuoteList } from "@/src/features/crm/quotes/components/quote-list";
import { getQuotes } from "@/src/features/crm/quotes/server/queries";
import type { QuoteListItem } from "@/src/features/crm/quotes/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `${copy.quotes} · ${copy.brand} ${copy.product}`,
};

export default async function QuotesPage() {
  let quotes: QuoteListItem[] = [];
  let loadError = false;

  try {
    quotes = await getQuotes();
  } catch {
    loadError = true;
  }

  return <QuoteList quotes={quotes} loadError={loadError} />;
}
