import type { QuoteSelections } from "@/src/features/cpq/types";
import {
  configChangesSchema,
  quoteCommunicationSchema,
  quoteListItemSchema,
  quotePortalSchema,
  quoteRevisionRendersSchema,
  quoteRevisionSchema,
  type QuoteCommunication,
  type QuoteCustomer,
  type QuoteListItem,
  type QuotePortal,
  type QuotePortalCustomer,
  type QuotePortalRecipient,
  type QuotePortalStatus,
  type QuoteRevision,
  type QuoteStatus,
} from "@/src/features/crm/quotes/types";
import {
  formatQuoteCash,
  formatQuoteDate,
  formatQuoteMonthly,
  formatQuotePrice,
  quoteDealLabel,
  quoteDisplayName,
  quoteMonthsLabel,
  quoteVersionLabel,
  quoteZip,
} from "@/src/features/crm/quotes/utils/formatting";

export type QuoteRevisionRow = {
  id: string;
  quote_id: string;
  revision_number: number;
  status: string;
  config?: unknown;
  selections?: unknown;
  config_changes?: unknown;
  communication?: unknown;
  renders?: unknown;
  shared_photos_at?: string | null;
  shared_quote_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function savedAt(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function toQuoteRevision(row: QuoteRevisionRow): QuoteRevision | undefined {
  const communication = quoteCommunicationSchema.safeParse(row.communication);
  const changes = configChangesSchema.safeParse(row.config_changes ?? {});
  const renders = quoteRevisionRendersSchema.safeParse(row.renders);
  const revision = quoteRevisionSchema.safeParse({
    id: row.id,
    quoteId: row.quote_id,
    revisionNumber: row.revision_number,
    status: row.status,
    selections: row.config ?? row.selections,
    configChanges: changes.success ? changes.data : {},
    communication: communication.success ? communication.data : null,
    renders: renders.success ? renders.data : null,
    sharedPhotosAt: savedAt(row.shared_photos_at),
    sharedQuoteAt: savedAt(row.shared_quote_at),
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
  quoteNumber?: number;
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
    dealLabel: input.quoteNumber ? quoteDisplayName(input.quoteNumber, input.specs) : quoteDealLabel(input.specs),
    zip: quoteZip(input.specs),
    customers: input.customers,
    priceLabel: formatQuotePrice(input.total),
    monthlyLabel: formatQuoteMonthly(input.monthly),
    status: quoteStatus(input.contractSent, input.invoiceSent),
  });
  return item.success ? item.data : undefined;
}

export function toQuotePortal(input: {
  id: string;
  invoiceId: string;
  revisionId: string;
  dealName: string;
  revisionNumber: number;
  createdAt: string;
  imageUrl: string;
  renders?: QuotePortal["renders"];
  monthly: number;
  months: number;
  lines: { label: string; amount: number }[];
  specs: { label: string; value: string }[];
  total: number;
  zip: string;
  won: boolean;
  customers: QuotePortalCustomer[];
  recipients: QuotePortalRecipient[];
  dealIds: string[];
  selections: QuoteSelections;
  communication: QuoteCommunication | null;
  status: QuotePortalStatus;
}): QuotePortal | undefined {
  const portal = quotePortalSchema.safeParse({
    id: input.id,
    invoiceId: input.invoiceId,
    revisionId: input.revisionId,
    dealName: input.dealName,
    versionLabel: quoteVersionLabel(input.revisionNumber),
    dateLabel: formatQuoteDate(input.createdAt),
    imageUrl: input.imageUrl,
    renders: input.renders ?? null,
    monthlyLabel: `${formatQuoteCash(input.monthly)}/mo`,
    monthsLabel: quoteMonthsLabel(input.months),
    lines: input.lines.map((line) => ({
      label: line.label,
      amountLabel: formatQuoteCash(line.amount),
    })),
    details: input.specs
      .filter((spec) => spec.label !== "Delivery ZIP" && spec.value.trim())
      .map((spec) => ({ label: spec.label, value: spec.value })),
    totalLabel: formatQuoteCash(input.total),
    zip: input.zip,
    won: input.won,
    customers: input.customers,
    recipients: input.recipients,
    dealIds: input.dealIds,
    selections: input.selections,
    communication: input.communication,
    status: input.status,
  });
  return portal.success ? portal.data : undefined;
}
