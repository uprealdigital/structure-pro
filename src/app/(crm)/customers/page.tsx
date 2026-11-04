import { CustomerList } from "@/src/features/crm/customers/components/customer-list";
import { copy } from "@/src/features/crm/common/locales/en";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `${copy.customers} · ${copy.brand} ${copy.product}`,
};

export default function CustomersPage() {
  return <CustomerList />;
}
