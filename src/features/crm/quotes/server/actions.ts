"use server";

import { revalidatePath } from "next/cache";
import { quoteSelectionsSchema } from "@/src/features/cpq/types";
import { readDeal, readDealsByIds, readDealsByQuoteId, updateDeal } from "@/src/features/crm/deals/db/deal";
import { createDealQuote, readDealQuotesForQuote } from "@/src/features/crm/deals/db/deal-quote";
import { newInvoiceId } from "@/src/features/cpq/utils/id";
import { createQuote, deleteQuote, readActiveRevisionId, readQuote, updateQuote } from "@/src/features/crm/quotes/db/quote";
import {
  createQuoteRevision,
  readQuoteRevision,
  storeQuoteRevisionRender,
  updateQuoteRevisionCommunication,
  updateQuoteRevisionPhotosShare,
  updateQuoteRevisionRenders,
} from "@/src/features/crm/quotes/db/quote-revision";
import {
  createDealQuoteSchema,
  payQuoteDepositSchema,
  quoteCommunicationWriteSchema,
  quoteRevisionActivateSchema,
  quoteRevisionRenderFilesSchema,
  type QuoteRevisionRenders,
} from "@/src/features/crm/quotes/types";

export async function saveQuoteSelections(input: {
  quoteId: string;
  selections: unknown;
  renders?: unknown;
}): Promise<
  | {
      success: true;
      data: {
        id: string;
        revisionNumber: number;
        createdAt: string;
        updatedAt: string;
        renders: QuoteRevisionRenders | null;
      };
    }
  | { error: string }
> {
  const quoteId = input.quoteId.trim();
  const selections = quoteSelectionsSchema.safeParse(input.selections);
  if (!quoteId || !selections.success) {
    return { error: "A quote and configuration are required" };
  }
  const renders = input.renders == null ? null : quoteRevisionRenderFilesSchema.safeParse(input.renders);
  if (renders && !renders.success) return { error: "A render of this quote is required" };

  try {
    const revision = await createQuoteRevision({
      quoteId,
      selections: selections.data,
      status: "draft",
    });
    await updateQuote(quoteId, { activeRevisionId: revision.id });
    const stored = renders
      ? await storeRevisionRenders(revision.id, renders.data)
      : null;
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
        renders: stored,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save quote";
    return { error: message };
  }
}

async function storeRevisionRenders(
  revisionId: string,
  files: {
    full: Blob;
    medium: Blob;
    small: Blob;
  },
): Promise<QuoteRevisionRenders> {
  const [full, medium, small] = await Promise.all([
    storeQuoteRevisionRender({
      revisionId,
      size: "full",
      bytes: new Uint8Array(await files.full.arrayBuffer()),
    }),
    storeQuoteRevisionRender({
      revisionId,
      size: "medium",
      bytes: new Uint8Array(await files.medium.arrayBuffer()),
    }),
    storeQuoteRevisionRender({
      revisionId,
      size: "small",
      bytes: new Uint8Array(await files.small.arrayBuffer()),
    }),
  ]);
  return updateQuoteRevisionRenders(revisionId, {
    render_full_url: full,
    render_medium_url: medium,
    render_small_url: small,
  });
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

export async function shareQuoteRevisionPhotos(
  revisionId: string,
): Promise<{ success: true; data: { sharedPhotosAt: string } } | { error: string }> {
  const id = revisionId.trim();
  if (!id) return { error: "A quote revision is required" };

  try {
    const revision = await readQuoteRevision(id);
    if (!revision) return { error: "Quote revision was not found" };
    const sharedPhotosAt = new Date().toISOString();
    const saved = await updateQuoteRevisionPhotosShare({ revisionId: revision.id, sharedPhotosAt });
    revalidatePath("/crm/conversations");
    revalidatePath("/crm/quotes");
    revalidatePath(`/quote/${revision.quoteId}`);
    return { success: true, data: { sharedPhotosAt: saved.sharedPhotosAt ?? sharedPhotosAt } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not record the shared photos";
    return { error: message };
  }
}

function missingDealQuotes(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("permission denied") ||
    message.includes("42501") ||
    (message.includes("deal_quotes") &&
      (message.includes("does not exist") ||
        message.includes("schema cache") ||
        message.includes("could not find")))
  );
}

export async function createDealQuoteAction(input: {
  dealId: string;
  selections: unknown;
}): Promise<
  | {
      success: true;
      data: {
        id: string;
        invoiceId: string;
        quoteNumber?: number;
        revisionId: string;
        revisionNumber: number;
        createdAt: string;
        updatedAt: string;
      };
    }
  | { error: string }
> {
  const parsed = createDealQuoteSchema.safeParse(input);
  if (!parsed.success) return { error: "A deal and configuration are required" };

  let quoteId = "";
  try {
    const deal = await readDeal(parsed.data.dealId);
    if (!deal) return { error: "Deal was not found" };
    const invoiceId = newInvoiceId();
    quoteId = await createQuote({ invoiceId, selections: parsed.data.selections });
    await createDealQuote({ dealId: deal.id, quoteId });
    const savedQuote = await readQuote(quoteId);
    const revisionId = await readActiveRevisionId(quoteId);
    const revision = revisionId ? await readQuoteRevision(revisionId) : undefined;
    if (!revision) return { error: "Could not add a quote" };
    revalidatePath("/crm/conversations");
    revalidatePath("/crm/quotes");
    revalidatePath("/crm/deals");
    return {
      success: true,
      data: {
        id: quoteId,
        invoiceId,
        quoteNumber: savedQuote?.quoteNumber,
        revisionId: revision.id,
        revisionNumber: revision.revisionNumber,
        createdAt: revision.createdAt,
        updatedAt: revision.updatedAt,
      },
    };
  } catch (error) {
    if (quoteId) await deleteQuote(quoteId).catch(() => undefined);
    if (missingDealQuotes(error)) return { error: "Could not add a quote yet" };
    const message = error instanceof Error ? error.message : "Could not add a quote";
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
    const [direct, linked] = await Promise.all([
      readDealsByQuoteId(parsed.data.quoteId),
      readDealQuotesForQuote(parsed.data.quoteId),
    ]);
    const seen = new Set(direct.map((deal) => deal.id));
    const extra = await readDealsByIds(linked.map((link) => link.dealId).filter((id) => !seen.has(id)));
    const deals = [...direct, ...extra];
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
