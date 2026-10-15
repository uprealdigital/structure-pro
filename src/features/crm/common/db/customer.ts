import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import { customerPatchSchema, customerWriteSchema, type Customer } from "@/src/features/crm/common/types";
import { toCustomer, type CustomerRow } from "@/src/features/crm/common/utils/mappers";
import { createConversation } from "@/src/features/crm/conversations/db/conversation";

function crm() {
  return db("crm");
}

const customerColumns = "id, full_name, phone, email, opted_out, active_deal_id, created_at";
const legacyCustomerColumns = "id, full_name, phone, email, opted_out, created_at";

function missingActiveDeal(error: { message?: string } | null): boolean {
  return /active_deal_id/i.test(error?.message ?? "");
}

async function selectCustomer<T>(
  run: (columns: string) => PromiseLike<{ data: T; error: { message: string } | null }>,
): Promise<T> {
  const first = await run(customerColumns);
  if (!missingActiveDeal(first.error)) {
    throwIfError(first.error);
    return first.data;
  }
  const second = await run(legacyCustomerColumns);
  throwIfError(second.error);
  return second.data;
}

export async function phoneOptedOut(phone: string): Promise<boolean> {
  const { data, error } = await crm()
    .from("customers")
    .select("id")
    .eq("phone", phone)
    .eq("opted_out", true)
    .limit(1);

  throwIfError(error);
  return (data?.length ?? 0) > 0;
}

export async function readCustomerByPhone(phone: string): Promise<Customer | undefined> {
  const data = await selectCustomer((columns) =>
    crm().from("customers").select(columns).eq("phone", phone).maybeSingle(),
  );
  if (!data) return undefined;
  return toCustomer(data as CustomerRow);
}

export async function createCustomer(input: {
  fullName: string;
  phone: string;
  email: string;
  optedOut?: boolean;
}): Promise<Customer> {
  const customer = customerWriteSchema.parse(input);
  const optedOut = customer.optedOut === true || (await phoneOptedOut(customer.phone));
  const { data, error } = await crm()
    .from("customers")
    .insert({
      full_name: customer.fullName,
      phone: customer.phone,
      email: customer.email,
      opted_out: optedOut,
      updated_at: new Date().toISOString(),
    })
    .select(legacyCustomerColumns)
    .single();

  throwIfError(error);
  const saved = data ? toCustomer(data as CustomerRow) : undefined;
  if (!saved) throw new Error("Customer was not saved");
  await ensureCustomerThread(saved);
  return saved;
}

export async function ensureCustomerThread(customer: Customer): Promise<void> {
  await createConversation({
    lookupKey: customer.phone.trim() || customer.id,
    customerId: customer.id,
    contractSent: false,
    activities: [],
  });
}

export async function readCustomer(id: string): Promise<Customer | undefined> {
  const data = await selectCustomer((columns) =>
    crm().from("customers").select(columns).eq("id", id).maybeSingle(),
  );
  if (!data) return undefined;
  return toCustomer(data as CustomerRow);
}

export async function readCustomers(): Promise<Customer[]> {
  const data = await selectCustomer((columns) =>
    crm().from("customers").select(columns).order("created_at", { ascending: false }),
  );
  return ((data ?? []) as CustomerRow[])
    .map(toCustomer)
    .filter((customer): customer is Customer => customer != null);
}

export async function updateCustomer(
  id: string,
  patch: { fullName?: string; email?: string; phone?: string; optedOut?: boolean; activeDealId?: string },
): Promise<void> {
  const next = customerPatchSchema.parse(patch);
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (next.fullName !== undefined) row.full_name = next.fullName;
  if (next.email !== undefined) row.email = next.email;
  if (next.phone !== undefined) row.phone = next.phone;
  if (next.optedOut !== undefined) row.opted_out = next.optedOut;
  if (next.activeDealId !== undefined) row.active_deal_id = next.activeDealId;
  const { error } = await crm().from("customers").update(row).eq("id", id);
  throwIfError(error);
}

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await crm().from("customers").delete().eq("id", id);
  throwIfError(error);
}
