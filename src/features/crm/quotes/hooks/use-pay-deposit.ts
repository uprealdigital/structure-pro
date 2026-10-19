"use client";

import { useState } from "react";
import { payQuoteDeposit } from "@/src/features/crm/quotes/server/actions";
import { portalCopy } from "@/src/features/crm/quotes/locales/en";

export function usePayDeposit(quoteId: string, initiallyWon: boolean) {
  const [won, setWon] = useState(initiallyWon);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    if (pending || won) return;
    setPending(true);
    setError("");
    const result = await payQuoteDeposit({ quoteId });
    if ("error" in result) {
      setError(result.error || portalCopy.payError);
      setPending(false);
      return;
    }
    setWon(true);
    setPending(false);
  }

  return { won, pending, error, pay };
}
