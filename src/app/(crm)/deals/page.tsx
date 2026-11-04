import { DealsBoard } from "@/src/features/crm/deals/components/deals-board";
import { copy } from "@/src/features/crm/common/locales/en";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `${copy.deals} · ${copy.brand} ${copy.product}`,
};

export default function DealsPage() {
  return <DealsBoard />;
}
