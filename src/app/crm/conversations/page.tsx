import { ConversationWorkspaceView } from "@/src/features/crm/conversations/components/conversation-workspace";
import { copy as conversationCopy } from "@/src/features/crm/conversations/locales/en";
import {
  getConversationInbox,
  getConversationWorkspace,
} from "@/src/features/crm/conversations/server/queries";
import type { ConversationInboxItem, ConversationWorkspace } from "@/src/features/crm/conversations/types";
import { copy } from "@/src/features/crm/common/locales/en";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `${conversationCopy.conversations} · ${copy.brand} ${copy.product}`,
};

function selectedConversationId(value: string | string[] | undefined): string | undefined {
  const id = Array.isArray(value) ? value[0] : value;
  const trimmed = id?.trim();
  return trimmed ? trimmed : undefined;
}

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string | string[] }>;
}) {
  const params = await searchParams;
  const requestedId = selectedConversationId(params.conversation);
  let inbox: ConversationInboxItem[] = [];
  let workspace: ConversationWorkspace | undefined;
  let selectedId = requestedId;
  let loadError = false;

  try {
    inbox = await getConversationInbox();
    selectedId = requestedId ?? inbox[0]?.id;
    if (selectedId) workspace = await getConversationWorkspace(selectedId);
  } catch {
    loadError = true;
  }

  return (
    <ConversationWorkspaceView
      inbox={inbox}
      workspace={workspace}
      selectedId={selectedId}
      loadError={loadError}
    />
  );
}
