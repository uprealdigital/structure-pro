import { ConversationScreen } from "@/src/features/crm/conversations/components/conversation-screen";
import { copy as conversationCopy } from "@/src/features/crm/conversations/locales/en";
import { copy } from "@/src/features/crm/common/locales/en";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `${conversationCopy.conversations} · ${copy.brand} ${copy.product}`,
};

export default function ConversationsPage() {
  return <ConversationScreen />;
}
