import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import { dealPatchSchema, dealWriteSchema, type Deal } from "@/src/features/crm/deals/types";
import { toDeal, type DealRow } from "@/src/features/crm/deals/utils/mappers";

function crm() {
  return db("crm");
}

const dealColumns = "id, quote_id, source, status, previous_status, name, created_at";
const legacyDealColumns = "id, quote_id, source, status, previous_status, created_at";

function nameColumnMissing(error: { message: string } | null): boolean {
  if (!error) return false;
  const message = error.message.toLowerCase();
  return message.includes("name") && (message.includes("does not exist") || message.includes("schema cache"));
}

async function queryDeals<T>(
  run: (columns: string) => PromiseLike<{
    data: T;
    error: { message: string; code?: string; details?: string; hint?: string } | null;
  }>,
): Promise<T> {
  const first = await run(dealColumns);
  if (!nameColumnMissing(first.error)) {
    throwIfError(first.error);
    return first.data;
  }
  const second = await run(legacyDealColumns);
  throwIfError(second.error);
  return second.data;
}

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
      status: "lead",
    })
    .select(legacyDealColumns)
    .single();

  throwIfError(error);
  const saved = data ? toDeal(data as DealRow) : undefined;
  if (!saved) throw new Error("Deal was not saved");
  return saved;
}

export async function readDeals(): Promise<Deal[]> {
  const data = await queryDeals((columns) =>
    crm().from("deals").select(columns).order("created_at", { ascending: false }),
  );
  return ((data ?? []) as DealRow[])
    .map(toDeal)
    .filter((deal): deal is Deal => deal != null);
}

export async function readDealsByIds(ids: string[]): Promise<Deal[]> {
  if (ids.length === 0) return [];
  const data = await queryDeals((columns) => crm().from("deals").select(columns).in("id", ids));
  return ((data ?? []) as DealRow[])
    .map(toDeal)
    .filter((deal): deal is Deal => deal != null);
}

export async function readDeal(id: string): Promise<Deal | undefined> {
  const data = await queryDeals((columns) =>
    crm().from("deals").select(columns).eq("id", id).maybeSingle(),
  );
  if (!data) return undefined;
  return toDeal(data as DealRow);
}

export async function updateDeal(
  id: string,
  patch: { status?: unknown; quoteId?: string; name?: string },
): Promise<void> {
  const next = dealPatchSchema.parse(patch);
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (next.name) row.name = next.name;
  if (next.status) {
    const current = await readDeal(id);
    row.status = next.status;
    if (current && current.status !== next.status) row.previous_status = current.status;
  }
  if (next.quoteId) row.quote_id = next.quoteId;
  const { error } = await crm().from("deals").update(row).eq("id", id);
  throwIfError(error);
}

export async function deleteDeal(id: string): Promise<void> {
  const { error } = await crm().from("deals").delete().eq("id", id);
  throwIfError(error);
}
