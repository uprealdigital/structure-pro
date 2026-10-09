"use client";

import { Calendar, ChevronDown, Globe, Mail, Phone } from "lucide-react";
import { useState } from "react";
import { copy } from "@/src/features/crm/conversations/locales/en";
import type { ConversationWorkspace } from "@/src/features/crm/conversations/types";
import { dealSummarySentence, formatDetailTimestamp } from "@/src/features/crm/conversations/utils/formatting";
import { contactInitials, specValue } from "@/src/features/crm/common/utils/formatting";

function sourceLabel(source: ConversationWorkspace["deal"]["source"]): string {
  return source === "yard_preview" ? copy.sourceYardPreview : copy.sourceWebsite;
}

export function DealSummary({ workspace }: { workspace: ConversationWorkspace }) {
  const [open, setOpen] = useState(true);
  const specs = workspace.quote?.specs ?? [];
  const summary = dealSummarySentence({
    source: workspace.deal.source,
    style: specValue(specs, "Style"),
    size: specValue(specs, "Size"),
    siding: specValue(specs, "Siding"),
    roof: specValue(specs, "Roof"),
    door: specValue(specs, "Door"),
  });

  return (
    <div className="col-span-1 space-y-3.5 border-gray-200 pr-4">
      <div className="space-y-3">
        <div className="space-y-2 p-2.5">
          <span className="text-xs font-semibold text-gray-900">{copy.dealSummary}</span>
          <p className="text-xs leading-relaxed font-normal text-gray-700">{summary}</p>
        </div>
        <div className="space-y-2 border-gray-200 pt-3">
          <div className={`bg-gray-50/90 p-3.5 transition-all ${open ? "rounded-2xl" : "rounded-full px-3.5 py-2"}`}>
            <button
              type="button"
              className="group flex w-full cursor-pointer items-center justify-between text-left select-none"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 font-serif text-[10px] font-bold text-gray-700">
                  {contactInitials(workspace.customer.fullName)}
                </span>
                <span className="truncate text-xs font-semibold text-gray-900 transition-colors group-hover:text-black">
                  {workspace.customer.fullName}
                </span>
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform duration-200 group-hover:text-gray-700 ${
                  open ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              />
            </button>
            {open ? (
              <div className="mt-3.5 space-y-2 pl-0.5 text-xs">
                <a
                  href={`tel:${workspace.customer.phone}`}
                  className="flex items-center gap-2 font-normal text-gray-700"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0 text-gray-500" strokeWidth={1.8} aria-hidden="true" />
                  <span>{workspace.customer.phone}</span>
                </a>
                <a
                  href={`mailto:${workspace.customer.email}`}
                  className="flex items-center gap-2 truncate font-normal text-gray-600 hover:text-gray-900 hover:underline"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0 text-gray-500" strokeWidth={1.8} aria-hidden="true" />
                  <span className="truncate">{workspace.customer.email}</span>
                </a>
              </div>
            ) : null}
          </div>

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
