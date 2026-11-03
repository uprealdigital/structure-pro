import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import { dealershipPatchSchema, dealershipWriteSchema, type Dealership } from "@/src/features/crm/common/types";
import { toDealership, type DealershipRow } from "@/src/features/crm/common/utils/mappers";

function crm() {
  return db("crm");
}

const columns =
  "id, organization_id, name, description, address, city, state, postal_code, has_physical_location, position";

export async function createDealership(input: {
  organizationId: string;
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  hasPhysicalLocation: boolean;
  position: number;
}): Promise<Dealership> {
  const dealership = dealershipWriteSchema.parse(input);
  const { data, error } = await crm()
    .from("dealerships")
    .insert({
      organization_id: dealership.organizationId,
      name: dealership.name,
      description: dealership.description,
      address: dealership.address,
      city: dealership.city,
      state: dealership.state,
      postal_code: dealership.postalCode,
      has_physical_location: dealership.hasPhysicalLocation,
      position: dealership.position,
      updated_at: new Date().toISOString(),
    })
    .select(columns)
    .single();

  throwIfError(error);
  const saved = data ? toDealership(data as unknown as DealershipRow) : undefined;
  if (!saved) throw new Error("Dealership was not saved");
  return saved;
}

export async function readDealership(id: string): Promise<Dealership | undefined> {
  const { data, error } = await crm().from("dealerships").select(columns).eq("id", id).maybeSingle();
  throwIfError(error);
  if (!data) return undefined;
  return toDealership(data as DealershipRow);
}

export async function readDealerships(): Promise<Dealership[]> {
  const { data, error } = await crm().from("dealerships").select(columns).order("position", { ascending: true });
  throwIfError(error);
  return ((data ?? []) as DealershipRow[])
    .map(toDealership)
    .filter((dealership): dealership is Dealership => dealership != null);
}

export async function updateDealership(
  id: string,
  patch: {
    organizationId?: string;
    name?: string;
    description?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    hasPhysicalLocation?: boolean;
    position?: number;
  },
): Promise<void> {
  const next = dealershipPatchSchema.parse(patch);
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (next.organizationId !== undefined) row.organization_id = next.organizationId;
  if (next.name !== undefined) row.name = next.name;
  if (next.description !== undefined) row.description = next.description;
  if (next.address !== undefined) row.address = next.address;
  if (next.city !== undefined) row.city = next.city;
  if (next.state !== undefined) row.state = next.state;
  if (next.postalCode !== undefined) row.postal_code = next.postalCode;
  if (next.hasPhysicalLocation !== undefined) row.has_physical_location = next.hasPhysicalLocation;
  if (next.position !== undefined) row.position = next.position;
  const { error } = await crm().from("dealerships").update(row).eq("id", id);
  throwIfError(error);
}

export async function deleteDealership(id: string): Promise<void> {
  const { error } = await crm().from("dealerships").delete().eq("id", id);
  throwIfError(error);
}
