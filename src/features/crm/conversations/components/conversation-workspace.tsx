"use client";

import { ConversationDetail } from "@/src/features/crm/conversations/components/conversation-detail";
import { ConversationDetailSkeleton } from "@/src/features/crm/conversations/components/conversation-skeleton";
import { ConversationList } from "@/src/features/crm/conversations/components/conversation-list";
import { useConversationSelection } from "@/src/features/crm/conversations/hooks/use-conversation-selection";
import { copy } from "@/src/features/crm/conversations/locales/en";
import type { ConversationInboxItem, ConversationWorkspace } from "@/src/features/crm/conversations/types";

export function ConversationWorkspaceView({
  inbox,
  workspace,
  selectedId,
  loadError,
}: {
  inbox: ConversationInboxItem[];
  workspace?: ConversationWorkspace;
  selectedId?: string;
  loadError: boolean;
}) {
  const selection = useConversationSelection({
    initialSelectedId: selectedId,
    initialWorkspace: workspace,
  });
  const showDetail = Boolean(selection.selectedId);
  const showLoadError = loadError || (showDetail && selection.status === "error");

  return (
    <>
      <ConversationList inbox={inbox} selectedId={selection.selectedId} onSelect={selection.selectConversation} />
      <section
        className={`${showDetail ? "flex" : "hidden lg:flex"} min-h-0 min-w-0 flex-1 flex-col`}
      >
        {showLoadError ? (
          <div className="flex flex-1 items-center justify-center px-6">
            <p className="text-sm text-gray-500">{copy.loadError}</p>
          </div>
        ) : selection.workspace && selection.status !== "pending" ? (
          <ConversationDetail
            key={selection.workspace.id}
            workspace={selection.workspace}
            onBack={selection.clearConversation}
          />
        ) : showDetail && selection.status === "pending" ? (
          <ConversationDetailSkeleton />
        ) : showDetail ? (
          <div className="flex flex-1 items-center justify-center px-6">
            <p className="text-sm text-gray-500">{copy.missingConversation}</p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <h2 className="font-serif text-2xl font-semibold text-gray-950">{copy.selectConversation}</h2>
            <p className="mt-2 max-w-sm text-sm leading-5 text-gray-500">
              {copy.selectConversationBody}
            </p>
          </div>
        )}
      </section>
    </>
  );
}
