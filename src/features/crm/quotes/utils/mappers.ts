import {
  quoteListItemSchema,
  type QuoteCustomer,
  type QuoteListItem,
  type QuoteStatus,
} from "@/src/features/crm/quotes/types";
import {
  formatQuoteMonthly,
  formatQuotePrice,
  quoteDealLabel,
  quoteZip,
} from "@/src/features/crm/quotes/utils/formatting";

function quoteStatus(contractSent: boolean, invoiceSent: boolean): QuoteStatus {
  if (contractSent) return "contract";
  if (invoiceSent) return "sent";
  return "draft";
}

export function toQuoteListItem(input: {
  id: string;
  invoiceId: string;
  createdAt: string;
  specs: { label: string; value: string }[];
  total: number;
  monthly: number;
  customers: QuoteCustomer[];
  contractSent: boolean;
  invoiceSent: boolean;
}): QuoteListItem | undefined {
  const item = quoteListItemSchema.safeParse({
    id: input.id,
    invoiceId: input.invoiceId,
    createdAt: input.createdAt,
    dealLabel: quoteDealLabel(input.specs),
    zip: quoteZip(input.specs),
    customers: input.customers,
    priceLabel: formatQuotePrice(input.total),
    monthlyLabel: formatQuoteMonthly(input.monthly),
    status: quoteStatus(input.contractSent, input.invoiceSent),
  });
  return item.success ? item.data : undefined;
}
