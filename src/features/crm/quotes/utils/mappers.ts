import {
  quoteCommunicationSchema,
  quoteListItemSchema,
  quoteRevisionSchema,
  type QuoteCustomer,
  type QuoteListItem,
  type QuoteRevision,
  type QuoteStatus,
} from "@/src/features/crm/quotes/types";
import {
  formatQuoteMonthly,
  formatQuotePrice,
  quoteDealLabel,
  quoteZip,
} from "@/src/features/crm/quotes/utils/formatting";

export type QuoteRevisionRow = {
  id: string;
  quote_id: string;
  revision_number: number;
  status: string;
  selections: unknown;
  communication?: unknown;
  created_at?: string | null;
  updated_at?: string | null;
};

export function toQuoteRevision(row: QuoteRevisionRow): QuoteRevision | undefined {
  const communication = quoteCommunicationSchema.safeParse(row.communication);
  const revision = quoteRevisionSchema.safeParse({
    id: row.id,
    quoteId: row.quote_id,
    revisionNumber: row.revision_number,
    status: row.status,
    selections: row.selections,
    communication: communication.success ? communication.data : null,
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? row.created_at ?? "",
  });
  return revision.success ? revision.data : undefined;
}

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
