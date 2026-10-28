import { copy } from "@/src/features/crm/common/locales/en";
import { copy as conversationCopy } from "@/src/features/crm/conversations/locales/en";
import ConversationsPage from "../conversations/page";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `${conversationCopy.conversations} · ${copy.brand} ${copy.product}`,
};

export default function Home(props: {
  searchParams: Promise<{ conversation?: string | string[]; deal?: string | string[] }>;
}) {
  return ConversationsPage(props);
}
