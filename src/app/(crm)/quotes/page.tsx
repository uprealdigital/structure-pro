import { QuoteList } from "@/src/features/crm/quotes/components/quote-list";
import { copy } from "@/src/features/crm/common/locales/en";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `${copy.quotes} · ${copy.brand} ${copy.product}`,
};

export default function QuotesPage() {
  return <QuoteList />;
}
