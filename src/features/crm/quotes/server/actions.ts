"use server";

import { revalidatePath } from "next/cache";
import { quoteSelectionsSchema } from "@/src/features/cpq/types";
import { updateQuote } from "@/src/features/crm/quotes/db/quote";

export async function saveQuoteSelections(input: {
  quoteId: string;
  selections: unknown;
}): Promise<{ success: true } | { error: string }> {
  const quoteId = input.quoteId.trim();
  const selections = quoteSelectionsSchema.safeParse(input.selections);
  if (!quoteId || !selections.success) {
    return { error: "A quote and configuration are required" };
  }

  try {
    await updateQuote(quoteId, { selections: selections.data });
    revalidatePath("/crm/conversations");
    revalidatePath("/crm/quotes");
    revalidatePath("/crm/deals");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save quote";
    return { error: message };
  }
}
