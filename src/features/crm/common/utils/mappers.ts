import { customerSchema, type Customer } from "@/src/features/crm/common/types";

export type CustomerRow = {
  id: string;
  deal_id: string;
  full_name: string;
  phone: string;
  email: string;
  opted_out: boolean;
  created_at?: string | null;
};

export function toCustomer(row: CustomerRow): Customer | undefined {
  const customer = customerSchema.safeParse({
    id: row.id,
    dealId: row.deal_id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    optedOut: row.opted_out,
    createdAt: row.created_at ?? undefined,
  });
  return customer.success ? customer.data : undefined;
}
