"use client";

import { Calendar, Globe } from "lucide-react";
import { CustomerPills } from "@/src/features/crm/common/components/customer-pills";
import { copy } from "@/src/features/crm/conversations/locales/en";
import type { ConversationParticipant, ConversationWorkspace } from "@/src/features/crm/conversations/types";
import { dealSummarySentence, formatDetailTimestamp } from "@/src/features/crm/conversations/utils/formatting";
import { orderedDealParticipants } from "@/src/features/crm/conversations/utils/participants";
import { specValue } from "@/src/features/crm/common/utils/formatting";

function sourceLabel(source: ConversationWorkspace["deal"]["source"]): string {
  return source === "yard_preview" ? copy.sourceYardPreview : copy.sourceWebsite;
}

export function DealSummary({
  workspace,
  participants,
  summary,
}: {
  workspace: ConversationWorkspace;
  participants: ConversationParticipant[];
  summary?: string;
}) {
  const specs = workspace.quote?.specs ?? [];
  const fallback = dealSummarySentence({
    source: workspace.deal.source,
    style: specValue(specs, "Style"),
    size: specValue(specs, "Size"),
    siding: specValue(specs, "Siding"),
    roof: specValue(specs, "Roof"),
    door: specValue(specs, "Door"),
  });
  const text = summary?.trim() || fallback;
  const people = orderedDealParticipants(participants).map((person) => ({
    id: person.customer.id,
    fullName: person.customer.fullName,
    phone: person.customer.phone,
    email: person.customer.email,
    primary: person.isPrimary,
  }));

  return (
    <div className="col-span-1 space-y-3.5 border-gray-200 pr-4">
      <div className="space-y-3">
        <div className="space-y-2 p-2.5">
          <h3 className="text-sm font-bold tracking-wider text-gray-900 uppercase">{copy.dealSummary}</h3>
          <p className="text-xs leading-relaxed font-normal whitespace-pre-line text-gray-700">{text}</p>
        </div>
        <div className="border-gray-200 pt-3">
          <CustomerPills people={people} openId={workspace.customer.id} />

          <div className="mt-1 flex flex-col gap-3 border-gray-100 pt-2.5 text-xs text-gray-500">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-gray-400">{copy.source}</span>
              <span className="inline-flex w-fit items-center gap-1 rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-800">
                <Globe className="h-3 w-3 shrink-0 text-gray-500" strokeWidth={1.8} aria-hidden="true" />
                {sourceLabel(workspace.deal.source)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-gray-400">{copy.creationDate}</span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-gray-700">
                <Calendar className="h-3 w-3 shrink-0 text-gray-400" strokeWidth={1.8} aria-hidden="true" />
                {formatDetailTimestamp(workspace.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
