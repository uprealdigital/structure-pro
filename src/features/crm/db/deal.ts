import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import { dealPatchSchema, dealWriteSchema, type Deal } from "@/src/features/crm/types";
import { toDeal, type DealRow } from "@/src/features/crm/utils/mappers";

function crm() {
  return db("crm");
}

export async function createDeal(input: {
  contactId: string;
  cpqQuoteId: string;
  source: unknown;
}): Promise<Deal> {
  const deal = dealWriteSchema.parse(input);
  const { data, error } = await crm()
    .from("deals")
    .insert({
      contact_id: deal.contactId,
      cpq_quote_id: deal.cpqQuoteId,
      source: deal.source,
      status: "open",
    })
    .select("id, contact_id, cpq_quote_id, source, status")
    .single();

  throwIfError(error);
  const saved = data ? toDeal(data as DealRow) : undefined;
  if (!saved) throw new Error("Deal was not saved");
  return saved;
}

export async function readDeal(id: string): Promise<Deal | undefined> {
  const { data, error } = await crm()
    .from("deals")
    .select("id, contact_id, cpq_quote_id, source, status")
    .eq("id", id)
    .maybeSingle();

  throwIfError(error);
  if (!data) return undefined;
  return toDeal(data as DealRow);
}

export async function updateDeal(
  id: string,
  patch: { status?: unknown; cpqQuoteId?: string },
): Promise<void> {
  const next = dealPatchSchema.parse(patch);
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (next.status) row.status = next.status;
  if (next.cpqQuoteId) row.cpq_quote_id = next.cpqQuoteId;
  const { error } = await crm().from("deals").update(row).eq("id", id);
  throwIfError(error);
}

export async function deleteDeal(id: string): Promise<void> {
  const { error } = await crm().from("deals").delete().eq("id", id);
  throwIfError(error);
}
