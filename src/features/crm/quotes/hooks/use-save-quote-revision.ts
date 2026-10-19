"use client";

import { useRouter } from "next/navigation";
import type { QuoteSelections } from "@/src/features/cpq/types";
import { saveQuoteSelections } from "@/src/features/crm/quotes/server/actions";

export function useSaveQuoteRevision(quoteId: string) {
  const router = useRouter();

  async function save(selections: QuoteSelections) {
    const result = await saveQuoteSelections({ quoteId, selections });
    if ("error" in result) throw new Error(result.error);
    router.refresh();
  }

  return { save };
}
