import { contactInitials } from "@/src/features/crm/common/utils/formatting";

export type QuoteCustomer = {
  id: string;
  name: string;
};

export function QuoteCustomers({ customers }: { customers: QuoteCustomer[] }) {
  const primary = customers[0];
  if (!primary) return null;
  const extra = customers.length - 1;

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="flex shrink-0 items-center -space-x-2">
        {customers.map((customer, index) => (
          <span
            key={customer.id}
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-xs font-semibold text-gray-800 ring-1 ring-gray-200"
            style={{ zIndex: customers.length - index }}
          >
            {contactInitials(customer.name)}
          </span>
        ))}
      </span>
      <span className="truncate font-sans text-xs font-normal text-gray-950">{primary.name}</span>
      {extra > 0 ? <span className="shrink-0 font-sans text-xs font-semibold text-gray-500">+{extra}</span> : null}
    </div>
  );
}
