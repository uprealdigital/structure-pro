"use client";

import { ArrowLeftRight, DollarSign } from "lucide-react";
import { copy } from "@/src/features/crm/conversations/locales/en";
import type { ConversationQuoteRevision } from "@/src/features/crm/conversations/types";
import type { ConfigChanges } from "@/src/features/crm/quotes/types";
import {
  changesSinceSharedPhotos,
  previousSharedPhotosRevision,
  withSuggestedChanges,
  type DesignPreviewChange,
} from "@/src/features/crm/conversations/utils/design-preview";

const visibleChangeCount = 4;

function ChangeIcon({ kind }: { kind: DesignPreviewChange["kind"] }) {
  const className = "h-3.5 w-3.5 shrink-0";
  if (kind === "price") return <DollarSign className={className} strokeWidth={1.5} aria-hidden="true" />;
  return <ArrowLeftRight className={className} strokeWidth={1.5} aria-hidden="true" />;
}

export function RevisionChangeList({
  current,
  revisions,
  suggested,
}: {
  current: ConversationQuoteRevision;
  revisions: ConversationQuoteRevision[];
  suggested?: ConfigChanges | null;
}) {
  const baseline = previousSharedPhotosRevision(revisions, current);
  const changes = withSuggestedChanges(changesSinceSharedPhotos(revisions, current), suggested);
  const changesScroll = changes.length > visibleChangeCount;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">{copy.designPreviewChanges}</h3>
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gray-200 px-1 text-[10px] font-semibold text-gray-600">
          {changes.length}
        </span>
      </div>
      {changes.length === 0 ? (
        <p className="text-xs text-gray-500">{baseline ? copy.noChangesSinceSharedPhotos : copy.noEarlierSharedPhotos}</p>
      ) : (
        <ul
          className={`space-y-1.5 ${changesScroll ? "max-h-[calc(4.5*1.25rem+4*0.375rem)] overflow-y-scroll overscroll-contain pr-2" : ""}`}
          onWheel={changesScroll ? (event) => event.stopPropagation() : undefined}
        >
          {changes.map((change) => (
            <li key={change.id} className="flex items-center gap-2 text-xs leading-5 font-normal text-gray-950">
              <ChangeIcon kind={change.kind} />
              <span>{change.text}</span>
              {change.suggested ? (
                <span className="inline-flex h-5 shrink-0 items-center rounded-full border border-purple-200 bg-purple-50 px-1.5 text-xs font-medium whitespace-nowrap text-purple-700">
                  {copy.aiSuggestion}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
