"use client";

import { useRouter } from "next/navigation";
import { sendQuoteMessages } from "@/src/features/crm/conversations/server/actions";
import type { QuoteCommunication } from "@/src/features/crm/quotes/types";

export function useSendQuote(input: {
  quoteId: string;
  revisionId: string;
  dealIds: string[];
  dealName: string;
  dealPrice: string;
}) {
  const router = useRouter();

  async function send(communication: QuoteCommunication) {
    const result = await sendQuoteMessages({ ...input, communication });
    if ("error" in result) throw new Error(result.error);
    router.refresh();
  }

  return { send };
}
