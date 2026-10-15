import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import { dealCustomerWriteSchema, type DealCustomer } from "@/src/features/crm/common/types";
import { toDealCustomer, type DealCustomerRow } from "@/src/features/crm/common/utils/mappers";

function crm() {
  return db("crm");
}

const dealCustomerColumns = "customer_id, deal_id, is_primary, created_at";

function linksFrom(rows: DealCustomerRow[] | null): DealCustomer[] {
  return (rows ?? [])
    .map(toDealCustomer)
    .filter((link): link is DealCustomer => link != null);
}

export async function createDealCustomer(input: {
  customerId: string;
  dealId: string;
  isPrimary: boolean;
}): Promise<DealCustomer> {
  const link = dealCustomerWriteSchema.parse(input);
  const { data, error } = await crm()
    .from("deal_customers")
    .insert({
      customer_id: link.customerId,
      deal_id: link.dealId,
      is_primary: link.isPrimary,
    })
    .select(dealCustomerColumns)
    .single();

  throwIfError(error);
  const saved = data ? toDealCustomer(data as DealCustomerRow) : undefined;
  if (!saved) throw new Error("Deal customer was not saved");
  return saved;
}

export async function readDealCustomer(
  customerId: string,
  dealId: string,
): Promise<DealCustomer | undefined> {
  const { data, error } = await crm()
    .from("deal_customers")
    .select(dealCustomerColumns)
    .eq("customer_id", customerId)
    .eq("deal_id", dealId)
    .maybeSingle();

  throwIfError(error);
  if (!data) return undefined;
  return toDealCustomer(data as DealCustomerRow);
}

export async function readDealCustomers(): Promise<DealCustomer[]> {
  const { data, error } = await crm()
    .from("deal_customers")
    .select(dealCustomerColumns)
    .order("created_at", { ascending: true });

  throwIfError(error);
  return linksFrom((data ?? []) as DealCustomerRow[]);
}

export async function readDealCustomersForCustomer(customerId: string): Promise<DealCustomer[]> {
  const { data, error } = await crm()
    .from("deal_customers")
    .select(dealCustomerColumns)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: true });

  throwIfError(error);
  return linksFrom((data ?? []) as DealCustomerRow[]);
}

export async function readDealCustomersForDeals(dealIds: string[]): Promise<DealCustomer[]> {
  if (dealIds.length === 0) return [];
  const { data, error } = await crm()
    .from("deal_customers")
    .select(dealCustomerColumns)
    .in("deal_id", dealIds)
    .order("created_at", { ascending: true });

  throwIfError(error);
  return linksFrom((data ?? []) as DealCustomerRow[]);
}

export async function readDealCustomersForDeal(dealId: string): Promise<DealCustomer[]> {
  const { data, error } = await crm()
    .from("deal_customers")
    .select(dealCustomerColumns)
    .eq("deal_id", dealId)
    .order("created_at", { ascending: true });

  throwIfError(error);
  return linksFrom((data ?? []) as DealCustomerRow[]);
}

export async function updateDealCustomer(
  customerId: string,
  dealId: string,
  isPrimary: boolean,
): Promise<void> {
  const link = dealCustomerWriteSchema.parse({ customerId, dealId, isPrimary });
  const { error } = await crm()
    .from("deal_customers")
    .update({ is_primary: link.isPrimary })
    .eq("customer_id", link.customerId)
    .eq("deal_id", link.dealId);

  throwIfError(error);
}

export async function deleteDealCustomer(customerId: string, dealId: string): Promise<void> {
  const { error } = await crm()
    .from("deal_customers")
    .delete()
    .eq("customer_id", customerId)
    .eq("deal_id", dealId);

  throwIfError(error);
}
