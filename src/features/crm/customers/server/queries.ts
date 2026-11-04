import "server-only";

import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import { customerListItemSchema, type CustomerListItem } from "@/src/features/crm/customers/types";

function crm() {
  return db("crm");
}

export async function getCustomers(): Promise<CustomerListItem[]> {
  const { data, error } = await crm()
    .from("customers")
    .select(
      `
      id,
      full_name,
      phone,
      email,
      created_at
    `,
    )
    .order("created_at", { ascending: false })
    .limit(50);

  throwIfError(error);
  return customerListItemSchema.array().parse(data ?? []);
}

