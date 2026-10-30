"use client";

import { sendQuoteMessages } from "@/src/features/crm/conversations/server/actions";
import type { QuoteCommunication } from "@/src/features/crm/quotes/types";

export function useSendQuote(input: {
  quoteId: string;
  revisionId: string;
  dealIds: string[];
  dealName: string;
  dealPrice: string;
  quoteName: string;
}) {
  async function send(
    communication: QuoteCommunication,
    attempt?: { sendId: string; active: () => boolean },
  ) {
    const result = await sendQuoteMessages({ ...input, communication, sendId: attempt?.sendId });
    if ("cancelled" in result) return;
    if ("error" in result) throw new Error(result.error);
  }

  return { send };
}
