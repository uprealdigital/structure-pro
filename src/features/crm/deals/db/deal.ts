import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import { readDealCustomersForCustomer, readDealCustomersForDeal } from "@/src/features/crm/common/db/deal-customer";
import { recordDealStatusActivity } from "@/src/features/crm/conversations/server/status-activity";
import { dealStatuses } from "@/src/features/crm/deals/config/status";
import { dealPatchSchema, dealWriteSchema, type Deal } from "@/src/features/crm/deals/types";
import { toDeal, type DealRow } from "@/src/features/crm/deals/utils/mappers";
import { defaultDealName } from "@/src/features/crm/deals/utils/naming";

function crm() {
  return db("crm");
}

const dealColumns = "id, quote_id, source, status, previous_status, name, viewed_at, created_at";

export async function createDeal(input: {
  quoteId: string;
  source: unknown;
}): Promise<Deal> {
  const deal = dealWriteSchema.parse(input);
  const inserted = await crm()
    .from("deals")
    .insert({
      quote_id: deal.quoteId,
      source: deal.source,
      status: "new_lead",
    })
    .select(dealColumns)
    .single();

  throwIfError(inserted.error);
  const saved = inserted.data ? toDeal(inserted.data as unknown as DealRow) : undefined;
  if (!saved) throw new Error("Deal was not saved");
  const name = defaultDealName(saved.source, saved.createdAt ?? new Date().toISOString());
  await updateDeal(saved.id, { name });
  return { ...saved, name };
}

export async function assignDefaultDealName(dealId: string): Promise<string | undefined> {
  const deal = await readDeal(dealId);
  if (!deal) return undefined;
  const onDeal = await readDealCustomersForDeal(dealId);
  const owner = onDeal.find((link) => link.isPrimary) ?? onDeal[0];
  let number = 1;
  if (owner) {
    const links = await readDealCustomersForCustomer(owner.customerId);
    const owned = links.filter((link) => link.isPrimary);
    const counted = owned.length > 0 ? owned : links;
    const related = await readDealsByIds(counted.map((link) => link.dealId));
    const ordered = related.sort((left, right) => {
      const leftAt = left.createdAt ?? "";
      const rightAt = right.createdAt ?? "";
      if (leftAt < rightAt) return -1;
      if (leftAt > rightAt) return 1;
      return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
    });
    const index = ordered.findIndex((item) => item.id === deal.id);
    number = index >= 0 ? index + 1 : ordered.length + 1;
  }
  const name = defaultDealName(deal.source, deal.createdAt ?? new Date().toISOString(), number);
  await updateDeal(deal.id, { name });
  return name;
}

export async function readDeals(): Promise<Deal[]> {
  const { data, error } = await crm().from("deals").select(dealColumns).order("created_at", { ascending: false });
  throwIfError(error);
  return ((data ?? []) as DealRow[])
    .map(toDeal)
    .filter((deal): deal is Deal => deal != null);
}

export async function readDealsByIds(ids: string[]): Promise<Deal[]> {
  if (ids.length === 0) return [];
  const { data, error } = await crm().from("deals").select(dealColumns).in("id", ids);
  throwIfError(error);
  return ((data ?? []) as DealRow[])
    .map(toDeal)
    .filter((deal): deal is Deal => deal != null);
}

export async function readDeal(id: string): Promise<Deal | undefined> {
  const { data, error } = await crm().from("deals").select(dealColumns).eq("id", id).maybeSingle();
  throwIfError(error);
  if (!data) return undefined;
  return toDeal(data as DealRow);
}

export async function readDealsByQuoteId(quoteId: string): Promise<Deal[]> {
  if (!quoteId) return [];
  const { data, error } = await crm()
    .from("deals")
    .select(dealColumns)
    .eq("quote_id", quoteId)
    .order("created_at", { ascending: false });
  throwIfError(error);
  return ((data ?? []) as DealRow[])
    .map(toDeal)
    .filter((deal): deal is Deal => deal != null);
}

export async function updateDeal(
  id: string,
  patch: { status?: unknown; quoteId?: string | null; name?: string; viewedAt?: string | null },
): Promise<void> {
  const next = dealPatchSchema.parse(patch);
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  let statusActivity: { dealId: string; name: string; status: string } | undefined;
  if (next.name) row.name = next.name;
  if (next.status) {
    const current = await readDeal(id);
    row.status = next.status;
    if (current && current.status !== next.status) {
      row.previous_status = current.status;
      const name =
        next.name?.trim() ||
        current.name?.trim() ||
        defaultDealName(current.source, current.createdAt ?? new Date().toISOString());
      statusActivity = { dealId: id, name, status: dealStatuses[next.status].label };
    }
  }
  if (next.quoteId !== undefined) row.quote_id = next.quoteId;
  if (next.viewedAt !== undefined) row.viewed_at = next.viewedAt;
  const updated = await crm().from("deals").update(row).eq("id", id);
  throwIfError(updated.error);
  if (statusActivity) await recordDealStatusActivity(statusActivity);
}

export async function deleteDeal(id: string): Promise<void> {
  const { error } = await crm().from("deals").delete().eq("id", id);
  throwIfError(error);
}
