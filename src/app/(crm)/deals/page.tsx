import { DealsBoard } from "@/src/features/crm/deals/components/deals-board";
import { getDealBoard } from "@/src/features/crm/deals/server/queries";
import type { DealBoardItem } from "@/src/features/crm/deals/types";
import { copy } from "@/src/features/crm/common/locales/en";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `${copy.deals} · ${copy.brand} ${copy.product}`,
};

export default async function DealsPage() {
  let deals: DealBoardItem[] = [];
  let loadError = false;

  try {
    deals = await getDealBoard();
  } catch {
    loadError = true;
  }

  return <DealsBoard deals={deals} loadError={loadError} />;
}
