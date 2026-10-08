import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import { contactPatchSchema, contactWriteSchema, type Contact } from "@/src/features/crm/types";
import { toContact, type ContactRow } from "@/src/features/crm/utils/mappers";

function crm() {
  return db("crm");
}

export async function createContact(input: {
  fullName: string;
  phone: string;
  email: string;
  optedOut?: boolean;
}): Promise<Contact> {
  const contact = contactWriteSchema.parse(input);
  const row: Record<string, unknown> = {
    full_name: contact.fullName,
    phone: contact.phone,
    email: contact.email,
    updated_at: new Date().toISOString(),
  };
  if (contact.optedOut !== undefined) row.opted_out = contact.optedOut;

  const { data, error } = await crm()
    .from("contacts")
    .upsert(row, { onConflict: "phone" })
    .select("id, full_name, phone, email, opted_out")
    .single();

  throwIfError(error);
  const saved = data ? toContact(data as ContactRow) : undefined;
  if (!saved) throw new Error("Contact was not saved");
  return saved;
}

export async function readContact(id: string): Promise<Contact | undefined> {
  const { data, error } = await crm()
    .from("contacts")
    .select("id, full_name, phone, email, opted_out")
    .eq("id", id)
    .maybeSingle();

  throwIfError(error);
  if (!data) return undefined;
  return toContact(data as ContactRow);
}

export async function updateContact(
  id: string,
  patch: { fullName?: string; email?: string; phone?: string; optedOut?: boolean },
): Promise<void> {
  const next = contactPatchSchema.parse(patch);
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (next.fullName !== undefined) row.full_name = next.fullName;
  if (next.email !== undefined) row.email = next.email;
  if (next.phone !== undefined) row.phone = next.phone;
  if (next.optedOut !== undefined) row.opted_out = next.optedOut;
  const { error } = await crm().from("contacts").update(row).eq("id", id);
  throwIfError(error);
}

export async function deleteContact(id: string): Promise<void> {
  const { error } = await crm().from("contacts").delete().eq("id", id);
  throwIfError(error);
}
