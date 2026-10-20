import {
  dealBoardItemSchema,
  dealSchema,
  dealStatusSchema,
  type Deal,
  type DealBoardItem,
  type DealStatus,
} from "@/src/features/crm/deals/types";

export type DealRow = {
  id: string;
  quote_id: string;
  source: string;
  status: string;
  previous_status?: string | null;
  name?: string | null;
  viewed_at?: string | null;
  created_at?: string | null;
};

const legacyStatus: Record<string, DealStatus> = {
  open: "lead",
  invoice_sent: "quote_sent",
};

function storedStatus(value: string | null | undefined): DealStatus | null {
  if (!value) return null;
  const parsed = dealStatusSchema.safeParse(legacyStatus[value] ?? value);
  return parsed.success ? parsed.data : null;
}

export function toDeal(row: DealRow): Deal | undefined {
  const deal = dealSchema.safeParse({
    id: row.id,
    quoteId: row.quote_id,
    source: row.source,
    status: legacyStatus[row.status] ?? row.status,
    previousStatus: storedStatus(row.previous_status),
    name: row.name?.trim() || null,
    viewedAt: "viewed_at" in row ? row.viewed_at ?? null : row.created_at ?? null,
    createdAt: row.created_at ?? undefined,
  });
  return deal.success ? deal.data : undefined;
}

const quotedStatuses = new Set<DealStatus>([
  "quote_sent",
  "quote_viewed",
  "partially_signed",
  "deal_won",
]);

export function quoteIssued(status: DealStatus): boolean {
  return quotedStatuses.has(status);
}

export function contractOnDeal(
  status: Deal["status"],
  contractSent: boolean,
  primaryDealCount: number,
): boolean {
  if (!contractSent) return false;
  if (primaryDealCount <= 1) return true;
  return status === "partially_signed" || status === "deal_won";
}

export function toDealBoardItem(input: {
  deal: Deal;
  contactName: string;
  productName: string;
  detail: string;
  valueLabel: string;
  conversationId?: string;
}): DealBoardItem | undefined {
  const item = dealBoardItemSchema.safeParse({
    id: input.deal.id,
    conversationId: input.conversationId,
    contactName: input.contactName,
    productName: input.productName,
    detail: input.detail,
    source: input.deal.source,
    stage: input.deal.status,
    valueLabel: input.valueLabel,
  });
  return item.success ? item.data : undefined;
}
