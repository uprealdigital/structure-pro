import { yardPreviewSchema, type YardPreview } from "@/src/features/ai/types";

export type YardPreviewRow = {
  id: string;
  crm_contact_id: string;
  crm_deal_id: string;
  status: string;
  error: unknown;
};

export function toYardPreview(row: YardPreviewRow): YardPreview | undefined {
  const preview = yardPreviewSchema.safeParse({
    id: row.id,
    crmContactId: row.crm_contact_id,
    crmDealId: row.crm_deal_id,
    status: row.status,
    error: typeof row.error === "string" ? row.error : null,
  });
  return preview.success ? preview.data : undefined;
}
