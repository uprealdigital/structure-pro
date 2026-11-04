import { copy } from "@/src/features/crm/common/locales/en";
import { DealsBoard } from "@/src/features/crm/deals/components/deals-board";
import { getDeals } from "@/src/features/crm/deals/server/queries";
import type { DealListItem } from "@/src/features/crm/deals/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `${copy.deals} · ${copy.brand} ${copy.product}`,
};

export default async function DealsPage() {
  let deals: DealListItem[] = [];
  let loadError = false;

  try {
    deals = await getDeals();
  } catch {
    loadError = true;
  }

  return <DealsBoard deals={deals} loadError={loadError} />;
}
