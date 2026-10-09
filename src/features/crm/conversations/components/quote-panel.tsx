import { Calendar } from "lucide-react";
import { copy } from "@/src/features/crm/conversations/locales/en";
import type { ConversationQuote } from "@/src/features/crm/conversations/types";
import { specValue } from "@/src/features/crm/common/utils/formatting";

export function QuotePanel({ quote }: { quote: ConversationQuote | null }) {
  if (!quote) {
    return (
      <div className="col-span-1 space-y-3 pl-4">
        <span className="text-xs font-semibold text-gray-900">{copy.estimateBreakdown}</span>
        <p className="text-xs text-gray-500">{copy.quoteUnavailable}</p>
      </div>
    );
  }

  const delivery = specValue(quote.specs, "Delivery ZIP");

  return (
    <div className="col-span-1 space-y-3 pl-4">
      <div className="flex items-center justify-between pb-1">
        <span className="text-xs font-semibold text-gray-900">{copy.estimateBreakdown}</span>
      </div>
      <div className="divide-y divide-gray-100 text-xs">
        {quote.lines.map((line) => (
          <div key={line.label} className="flex items-center justify-between py-2">
            <span className="font-medium text-gray-700">{line.label}</span>
            <span className="font-bold text-gray-950">{line.amountLabel}</span>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-gray-200 pt-2.5 pb-1">
          <span className="text-xs font-bold tracking-wider text-gray-950 uppercase">{copy.totalEstimate}</span>
          <span className="text-sm font-bold text-gray-950">{quote.totalLabel}</span>
        </div>
      </div>
      {delivery ? (
        <div className="space-y-1.5 border-gray-100 pt-2 text-xs text-gray-700">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-gray-500" strokeWidth={1.8} aria-hidden="true" />
            <span>
              {copy.deliveryTo} <span className="font-semibold text-gray-900 underline">{delivery}</span>
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
