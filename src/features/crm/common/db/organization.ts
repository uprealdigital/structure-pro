import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import {
  organizationPatchSchema,
  organizationWriteSchema,
  type Organization,
} from "@/src/features/crm/common/types";
import { toOrganization, type OrganizationRow } from "@/src/features/crm/common/utils/mappers";

function crm() {
  return db("crm");
}

const columns = "id, name, icon, description, position";

export async function createOrganization(input: {
  name: string;
  icon: string;
  description: string;
  position: number;
}): Promise<Organization> {
  const organization = organizationWriteSchema.parse(input);
  const { data, error } = await crm()
    .from("organizations")
    .insert({
      name: organization.name,
      icon: organization.icon,
      description: organization.description,
      position: organization.position,
      updated_at: new Date().toISOString(),
    })
    .select(columns)
    .single();

  throwIfError(error);
  const saved = data ? toOrganization(data as unknown as OrganizationRow) : undefined;
  if (!saved) throw new Error("Organization was not saved");
  return saved;
}

export async function readOrganization(id: string): Promise<Organization | undefined> {
  const { data, error } = await crm().from("organizations").select(columns).eq("id", id).maybeSingle();
  throwIfError(error);
  if (!data) return undefined;
  return toOrganization(data as OrganizationRow);
}

export async function readOrganizations(): Promise<Organization[]> {
  const { data, error } = await crm().from("organizations").select(columns).order("position", { ascending: true });
  throwIfError(error);
  return ((data ?? []) as OrganizationRow[])
    .map(toOrganization)
    .filter((organization): organization is Organization => organization != null);
}

export async function updateOrganization(
  id: string,
  patch: { name?: string; icon?: string; description?: string; position?: number },
): Promise<void> {
  const next = organizationPatchSchema.parse(patch);
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (next.name !== undefined) row.name = next.name;
  if (next.icon !== undefined) row.icon = next.icon;
  if (next.description !== undefined) row.description = next.description;
  if (next.position !== undefined) row.position = next.position;
  const { error } = await crm().from("organizations").update(row).eq("id", id);
  throwIfError(error);
}

export async function deleteOrganization(id: string): Promise<void> {
  const { error } = await crm().from("organizations").delete().eq("id", id);
  throwIfError(error);
}
