import { CustomerList } from "@/src/features/crm/customers/components/customer-list";
import { getCustomerList } from "@/src/features/crm/customers/server/queries";
import type { CustomerListItem } from "@/src/features/crm/customers/types";
import { copy } from "@/src/features/crm/common/locales/en";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `${copy.customers} · ${copy.brand} ${copy.product}`,
};

export default async function CustomersPage() {
  let customers: CustomerListItem[] = [];
  let loadError = false;

  try {
    customers = await getCustomerList();
  } catch {
    loadError = true;
  }

  return <CustomerList customers={customers} loadError={loadError} />;
}
