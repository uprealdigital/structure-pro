"use server";

import { revalidatePath } from "next/cache";
import { quoteSelectionsSchema } from "@/src/features/cpq/types";
import { readDealsByQuoteId, updateDeal } from "@/src/features/crm/deals/db/deal";
import { readActiveRevisionId, updateQuote } from "@/src/features/crm/quotes/db/quote";
import {
  createQuoteRevision,
  readQuoteRevision,
  updateQuoteRevisionCommunication,
} from "@/src/features/crm/quotes/db/quote-revision";
import {
  payQuoteDepositSchema,
  quoteCommunicationWriteSchema,
  quoteRevisionActivateSchema,
} from "@/src/features/crm/quotes/types";

export async function saveQuoteSelections(input: {
  quoteId: string;
  selections: unknown;
}): Promise<
  | {
      success: true;
      data: { id: string; revisionNumber: number; createdAt: string; updatedAt: string };
    }
  | { error: string }
> {
  const quoteId = input.quoteId.trim();
  const selections = quoteSelectionsSchema.safeParse(input.selections);
  if (!quoteId || !selections.success) {
    return { error: "A quote and configuration are required" };
  }

  try {
    const revision = await createQuoteRevision({
      quoteId,
      selections: selections.data,
      status: "draft",
    });
    await updateQuote(quoteId, { activeRevisionId: revision.id });
    revalidatePath("/crm/conversations");
    revalidatePath("/crm/quotes");
    revalidatePath("/crm/deals");
    revalidatePath(`/quote/${quoteId}`);
    return {
      success: true,
      data: {
        id: revision.id,
        revisionNumber: revision.revisionNumber,
        createdAt: revision.createdAt,
        updatedAt: revision.updatedAt,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save quote";
    return { error: message };
  }
}

export async function saveQuoteCommunication(input: {
  revisionId: string;
  communication: unknown;
}): Promise<{ success: true } | { error: string }> {
  const parsed = quoteCommunicationWriteSchema.safeParse(input);
  if (!parsed.success) return { error: "A revision and message are required" };

  try {
    const revision = await readQuoteRevision(parsed.data.revisionId);
    if (!revision) return { error: "Quote revision was not found" };
    await updateQuoteRevisionCommunication(parsed.data.revisionId, parsed.data.communication);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the message";
    return { error: message };
  }
}

export async function activateQuoteRevision(input: {
  quoteId: string;
  revisionId: string;
}): Promise<{ success: true; data: { revisionId: string } } | { error: string }> {
  const parsed = quoteRevisionActivateSchema.safeParse(input);
  if (!parsed.success) return { error: "A quote and revision are required" };

  try {
    const revision = await readQuoteRevision(parsed.data.revisionId);
    if (!revision || revision.quoteId !== parsed.data.quoteId) {
      return { error: "Quote revision was not found" };
    }
    await updateQuote(parsed.data.quoteId, { activeRevisionId: revision.id });
    revalidatePath("/crm/conversations");
    revalidatePath("/crm/quotes");
    revalidatePath("/crm/deals");
    return { success: true, data: { revisionId: revision.id } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update the active revision";
    return { error: message };
  }
}

export async function payQuoteDeposit(
  input: unknown,
): Promise<{ success: true } | { error: string }> {
  const parsed = payQuoteDepositSchema.safeParse(input);
  if (!parsed.success) return { error: "A quote is required" };

  try {
    const revisionId = await readActiveRevisionId(parsed.data.quoteId);
    if (!revisionId) return { error: "Quote was not found" };
    const deals = await readDealsByQuoteId(parsed.data.quoteId);
    if (deals.length === 0) return { error: "This quote is not attached to a deal" };
    for (const deal of deals) {
      if (deal.status === "deal_won") continue;
      await updateDeal(deal.id, { status: "deal_won" });
    }
    revalidatePath("/crm/conversations");
    revalidatePath("/crm/quotes");
    revalidatePath("/crm/deals");
    revalidatePath(`/quote/${parsed.data.quoteId}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not record this deposit";
    return { error: message };
  }
}
