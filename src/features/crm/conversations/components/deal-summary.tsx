"use client";

import { Calendar, Footprints, Globe, ImageIcon } from "lucide-react";
import { CustomerPills } from "@/src/features/crm/common/components/customer-pills";
import { copy } from "@/src/features/crm/conversations/locales/en";
import type { ConversationParticipant } from "@/src/features/crm/conversations/types";
import { dealSummarySentence, formatDetailTimestamp } from "@/src/features/crm/conversations/utils/formatting";
import { orderedDealParticipants } from "@/src/features/crm/conversations/utils/participants";
import { specValue } from "@/src/features/crm/common/utils/formatting";
import type { DealSource } from "@/src/features/crm/deals/types";

function sourceLabel(source: DealSource): string {
  if (source === "yard_preview") return copy.sourceYardPreview;
  if (source === "walk_in") return copy.sourceWalkIn;
  return copy.sourceWebsite;
}

function SourceIcon({ source }: { source: DealSource }) {
  if (source === "yard_preview") return <ImageIcon className="h-3 w-3 shrink-0 text-gray-500" strokeWidth={1.8} aria-hidden="true" />;
  if (source === "walk_in") return <Footprints className="h-3 w-3 shrink-0 text-gray-500" strokeWidth={1.8} aria-hidden="true" />;
  return <Globe className="h-3 w-3 shrink-0 text-gray-500" strokeWidth={1.8} aria-hidden="true" />;
}

export function DealSummary({
  source,
  createdAt,
  specs,
  customerId,
  participants,
  summary,
}: {
  source: DealSource;
  createdAt: string;
  specs: Array<{ label: string; value: string }>;
  customerId: string;
  participants: ConversationParticipant[];
  summary?: string;
}) {
  const fallback = dealSummarySentence({
    source,
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
    <div className="col-span-1 space-y-3.5 border-gray-200 lg:pr-4">
      <div className="space-y-3">
        <div className="space-y-2 p-2.5">
          <h3 className="text-sm font-bold tracking-wider text-gray-900 uppercase">{copy.dealSummary}</h3>
          <p className="text-xs leading-relaxed font-normal whitespace-pre-line text-gray-700">{text}</p>
        </div>
        <div className="border-gray-200 pt-3">
          <div className="max-lg:px-2.5">
            <CustomerPills people={people} openId={customerId} fullWidth />
          </div>

          <div className="mt-1 flex items-start gap-6 border-gray-100 px-2.5 pt-2.5 text-xs text-gray-500 lg:flex-col lg:gap-3 lg:px-0">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[11px] font-medium text-gray-400">{copy.source}</span>
              <span className="inline-flex w-fit items-center gap-1 rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-800">
                <SourceIcon source={source} />
                {sourceLabel(source)}
              </span>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[11px] font-medium text-gray-400">{copy.creationDate}</span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-gray-700">
                <Calendar className="h-3 w-3 shrink-0 text-gray-400" strokeWidth={1.8} aria-hidden="true" />
                {formatDetailTimestamp(createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
