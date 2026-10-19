"use client";

import { useRouter } from "next/navigation";
import { sendConversationQuote } from "@/src/features/crm/conversations/server/actions";

export function useSendQuote(quoteId: string, revisionId: string, dealIds: string[]) {
  const router = useRouter();

  async function send() {
    if (dealIds.length === 0) throw new Error("This quote is not attached to a deal");
    for (const dealId of dealIds) {
      const result = await sendConversationQuote({ quoteId, revisionId, dealId });
      if ("error" in result) throw new Error(result.error);
    }
    router.refresh();
  }

  return { send };
}
