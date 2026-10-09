import type { Customer } from "@/src/features/crm/common/types";
import { customerListItemSchema, type CustomerListItem } from "@/src/features/crm/customers/types";

export function toCustomerListItem(customer: Customer): CustomerListItem | undefined {
  const parts = customer.fullName.trim().split(/\s+/).filter(Boolean);
  const item = customerListItemSchema.safeParse({
    id: customer.id,
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
    phone: customer.phone,
    email: customer.email,
    createdAt: customer.createdAt ?? "",
  });
  return item.success ? item.data : undefined;
}
