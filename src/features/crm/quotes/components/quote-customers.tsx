import { contactInitials } from "@/src/features/crm/common/utils/formatting";
import type { QuoteCustomer } from "@/src/features/crm/quotes/types";

export function QuoteCustomers({ customers }: { customers: QuoteCustomer[] }) {
  if (customers.length === 0) return null;

  if (customers.length === 1) {
    const customer = customers[0];
    return (
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-[11px] font-medium text-gray-700">
          {contactInitials(customer.name)}
        </div>
        <span className="text-xs font-medium text-gray-900">{customer.name}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex shrink-0 items-center -space-x-2">
        {customers.map((customer, index) => (
          <div
            key={customer.id}
            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-medium ring-1 ring-gray-200 ${
              index === 0 ? "z-10 bg-gray-100 text-gray-700" : "bg-slate-100 text-slate-800"
            }`}
          >
            {contactInitials(customer.name)}
          </div>
        ))}
      </div>
      <div className="min-w-0">
        {customers.map((customer) => (
          <div key={customer.id} className="text-xs leading-tight font-medium text-gray-900">
            {customer.name}
          </div>
        ))}
      </div>
    </div>
  );
}
