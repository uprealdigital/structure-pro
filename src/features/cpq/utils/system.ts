import { CATALOG } from "@/src/features/cpq/utils/catalog";
import { describeSelections } from "@/src/features/cpq/utils/pricing";
import type { QuoteSelections } from "@/src/features/cpq/types";

export function openingSms(fullName: string, selections: QuoteSelections): string {
  const firstName = fullName.trim().split(/\s+/)[0] || "there";
  const { style, estimate } = describeSelections(selections);
  const total = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(estimate.total);

  const agent = process.env.COMPANY_CONTACT_NAME?.trim() || "Daniel";
  const company = CATALOG.brand.name;

  return `Hey ${firstName}, ${agent} from ${company} here. We just received a quote for a ${selections.width}-by-${selections.length} ${style.productTitle}, which comes out to about ${total}. When are you looking to get this done? Trying to get a bit more context so we can send the contract over.`;
}
