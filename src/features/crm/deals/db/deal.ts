import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import { dealPatchSchema, dealWriteSchema, type Deal } from "@/src/features/crm/deals/types";
import { toDeal, type DealRow } from "@/src/features/crm/deals/utils/mappers";

function crm() {
  return db("crm");
}

const dealColumns = "id, quote_id, source, status";

export async function createDeal(input: {
  quoteId: string;
  source: unknown;
}): Promise<Deal> {
  const deal = dealWriteSchema.parse(input);
  const { data, error } = await crm()
    .from("deals")
    .insert({
      quote_id: deal.quoteId,
      source: deal.source,
      status: "open",
    })
    .select(dealColumns)
    .single();

  throwIfError(error);
  const saved = data ? toDeal(data as DealRow) : undefined;
  if (!saved) throw new Error("Deal was not saved");
  return saved;
}

export async function readDeals(): Promise<Deal[]> {
  const { data, error } = await crm()
    .from("deals")
    .select(dealColumns)
    .order("created_at", { ascending: false });

  throwIfError(error);
  return ((data ?? []) as DealRow[])
    .map(toDeal)
    .filter((deal): deal is Deal => deal != null);
}

export async function readDeal(id: string): Promise<Deal | undefined> {
  const { data, error } = await crm()
    .from("deals")
    .select(dealColumns)
    .eq("id", id)
    .maybeSingle();

  throwIfError(error);
  if (!data) return undefined;
  return toDeal(data as DealRow);
}

export async function updateDeal(
  id: string,
  patch: { status?: unknown; quoteId?: string },
): Promise<void> {
  const next = dealPatchSchema.parse(patch);
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (next.status) row.status = next.status;
  if (next.quoteId) row.quote_id = next.quoteId;
  const { error } = await crm().from("deals").update(row).eq("id", id);
  throwIfError(error);
}

export async function deleteDeal(id: string): Promise<void> {
  const { error } = await crm().from("deals").delete().eq("id", id);
  throwIfError(error);
}
