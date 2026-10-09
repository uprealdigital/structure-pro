import {
  dealBoardItemSchema,
  dealSchema,
  type Deal,
  type DealBoardItem,
  type DealStage,
} from "@/src/features/crm/deals/types";

export type DealRow = {
  id: string;
  quote_id: string;
  source: string;
  status: string;
};

export function toDeal(row: DealRow): Deal | undefined {
  const deal = dealSchema.safeParse({
    id: row.id,
    quoteId: row.quote_id,
    source: row.source,
    status: row.status,
  });
  return deal.success ? deal.data : undefined;
}

function boardStage(status: Deal["status"], contractSent: boolean, hasQuote: boolean): DealStage {
  if (contractSent) return "contract";
  if (status === "invoice_sent") return "quote_sent";
  if (hasQuote) return "configured";
  return "new_lead";
}

export function toDealBoardItem(input: {
  deal: Deal;
  contactName: string;
  productName: string;
  detail: string;
  valueLabel: string;
  contractSent: boolean;
  hasQuote: boolean;
  conversationId?: string;
}): DealBoardItem | undefined {
  const item = dealBoardItemSchema.safeParse({
    id: input.deal.id,
    conversationId: input.conversationId,
    contactName: input.contactName,
    productName: input.productName,
    detail: input.detail,
    source: input.deal.source,
    stage: boardStage(input.deal.status, input.contractSent, input.hasQuote),
    valueLabel: input.valueLabel,
  });
  return item.success ? item.data : undefined;
}
