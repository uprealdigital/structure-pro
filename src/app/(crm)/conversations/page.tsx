import { ConversationWorkspaceView } from "@/src/features/crm/conversations/components/conversation-workspace";
import { copy as conversationCopy } from "@/src/features/crm/conversations/locales/en";
import { getConversation, getConversations } from "@/src/features/crm/conversations/server/queries";
import type { ConversationDetail, ConversationListItem } from "@/src/features/crm/conversations/types";
import { conversationStatus } from "@/src/features/crm/conversations/utils/list";
import { copy } from "@/src/features/crm/common/locales/en";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `${conversationCopy.conversations} · ${copy.brand} ${copy.product}`,
};

function selectedParam(value: string | string[] | undefined): string | undefined {
  const id = Array.isArray(value) ? value[0] : value;
  const trimmed = id?.trim();
  return trimmed ? trimmed : undefined;
}

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string | string[]; deal?: string | string[] }>;
}) {
  const params = await searchParams;
  const requestedId = selectedParam(params.conversation);
  const requestedDealId = selectedParam(params.deal);
  let conversations: ConversationListItem[] = [];
  let conversation: ConversationDetail | undefined;
  let selectedId = requestedId;
  let loadError = false;

  try {
    conversations = await getConversations();
    selectedId = requestedId ?? conversations.find((item) => conversationStatus(item) !== "deal_lost")?.id;
    if (selectedId) conversation = await getConversation(selectedId);
  } catch {
    loadError = true;
  }

  return (
    <ConversationWorkspaceView
      conversations={conversations}
      conversation={conversation}
      dealId={requestedDealId}
      selectedId={selectedId}
      loadError={loadError}
    />
  );
}
