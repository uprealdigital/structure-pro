"use client";

import { useState } from "react";
import { payQuoteDeposit } from "@/src/features/crm/quotes/server/actions";
import { portalCopy } from "@/src/features/crm/quotes/locales/en";

export function usePayDeposit(quoteId: string, initiallyWon: boolean) {
  const [won, setWon] = useState(initiallyWon);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function pay(): Promise<boolean> {
    if (pending || won) return false;
    setPending(true);
    setError("");
    const result = await payQuoteDeposit({ quoteId });
    if ("error" in result) {
      setError(result.error || portalCopy.payError);
      setPending(false);
      return false;
    }
    setWon(true);
    setPending(false);
    return true;
  }

  return { won, pending, error, pay };
}
