"use server";

import { revalidatePath } from "next/cache";
import { quoteSelectionsSchema } from "@/src/features/cpq/types";
import { describeSelections } from "@/src/features/cpq/utils/pricing";
import type { Activity } from "@/src/features/crm/conversations/types";
import { recordDuplicatedQuoteActivity } from "@/src/features/crm/conversations/server/status-activity";
import { portalCopy } from "@/src/features/crm/quotes/locales/en";
import { quoteDisplayName } from "@/src/features/crm/quotes/utils/formatting";
import { readDeal, readDealsByIds, readDealsByQuoteId, updateDeal } from "@/src/features/crm/deals/db/deal";
import { createDealQuote, readDealQuotes, readDealQuotesForQuote } from "@/src/features/crm/deals/db/deal-quote";
import { newInvoiceId } from "@/src/features/cpq/utils/id";
import { createQuote, deleteQuote, readActiveRevisionId, readQuote, readQuoteStatus, setQuoteStatus, updateQuote } from "@/src/features/crm/quotes/db/quote";
import {
  createQuoteRevision,
  readQuoteRevision,
  storeQuoteRevisionRender,
  updateQuoteRevisionCommunication,
  updateQuoteRevisionPhotosShare,
  updateQuoteRevisionRenders,
} from "@/src/features/crm/quotes/db/quote-revision";
import {
  cancelQuoteSchema,
  createDealQuoteSchema,
  duplicateQuoteSchema,
  payQuoteDepositSchema,
  quoteLifecycleSchema,
  quoteCommunicationWriteSchema,
  quoteRevisionActivateSchema,
  quoteRevisionRenderFilesSchema,
  type QuoteRevisionRenders,
  type QuoteStatus,
} from "@/src/features/crm/quotes/types";
import { quoteWindowExpired } from "@/src/features/crm/quotes/utils/status";
import { recordCrmLog } from "@/src/features/crm/common/db/log";

function revalidateConversations() {
  revalidatePath("/");
  revalidatePath("/conversations");
}

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
    revalidateConversations();
    revalidatePath("/quotes");
    revalidatePath("/deals");
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
    void recordCrmLog({ feature: "quotes", error });
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

export async function saveQuoteRevisionRenders(input: {
  revisionId: string;
  renders: unknown;
}): Promise<{ success: true; data: QuoteRevisionRenders } | { error: string }> {
  const revisionId = input.revisionId.trim();
  const renders = quoteRevisionRenderFilesSchema.safeParse(input.renders);
  if (!revisionId || !renders.success) return { error: "A render of this quote is required" };

  try {
    const revision = await readQuoteRevision(revisionId);
    if (!revision) return { error: "Quote revision was not found" };
    if (revision.renders) return { success: true, data: revision.renders };
    const stored = await storeRevisionRenders(revision.id, renders.data);
    revalidateConversations();
    revalidatePath("/quotes");
    revalidatePath(`/quote/${revision.quoteId}`);
    return { success: true, data: stored };
  } catch (error) {
    void recordCrmLog({ feature: "quotes", error });
    const message = error instanceof Error ? error.message : "Could not save the render";
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
    void recordCrmLog({ feature: "quotes", error });
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
    revalidateConversations();
    revalidatePath("/quotes");
    revalidatePath(`/quote/${revision.quoteId}`);
    return { success: true, data: { sharedPhotosAt: saved.sharedPhotosAt ?? sharedPhotosAt } };
  } catch (error) {
    void recordCrmLog({ feature: "quotes", error });
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
  conversationId?: string;
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
        activity?: Activity;
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
    const activity = await recordDuplicatedQuoteActivity({
      dealId: deal.id,
      name: savedQuote?.quoteNumber
        ? quoteDisplayName(savedQuote.quoteNumber, describeSelections(savedQuote.selections).specs)
        : portalCopy.quote,
      conversationId: parsed.data.conversationId,
    });
    revalidateConversations();
    revalidatePath("/quotes");
    revalidatePath("/deals");
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
        activity,
      },
    };
  } catch (error) {
    void recordCrmLog({ feature: "quotes", error });
    if (quoteId) await deleteQuote(quoteId).catch(() => undefined);
    if (missingDealQuotes(error)) return { error: "Could not add a quote yet" };
    const message = error instanceof Error ? error.message : "Could not add a quote";
    return { error: message };
  }
}

export async function duplicateQuote(input: {
  dealId: string;
  quoteId: string;
  revisionId?: string;
  conversationId?: string;
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
        renders: QuoteRevisionRenders | null;
        activity?: Activity;
      };
    }
  | { error: string }
> {
  const parsed = duplicateQuoteSchema.safeParse(input);
  if (!parsed.success) return { error: "A deal and quote are required" };

  let quoteId = "";
  try {
    const [deal, source, links] = await Promise.all([
      readDeal(parsed.data.dealId),
      readQuote(parsed.data.quoteId),
      readDealQuotes(parsed.data.dealId),
    ]);
    if (!deal || !source) return { error: "Quote was not found" };
    const onDeal = deal.quoteId === source.id || links.some((link) => link.quoteId === source.id);
    if (!onDeal) return { error: "Quote was not found" };
    const requestedRevision = parsed.data.revisionId ? await readQuoteRevision(parsed.data.revisionId) : undefined;
    if (parsed.data.revisionId && (!requestedRevision || requestedRevision.quoteId !== source.id)) {
      return { error: "Quote was not found" };
    }
    const sourceRevisionId = requestedRevision ? undefined : await readActiveRevisionId(source.id);
    const sourceRevision =
      requestedRevision ?? (sourceRevisionId ? await readQuoteRevision(sourceRevisionId) : undefined);
    const invoiceId = newInvoiceId();
    quoteId = await createQuote({
      invoiceId,
      selections: sourceRevision?.selections ?? source.selections,
    });
    const revisionId = await readActiveRevisionId(quoteId);
    const revision = revisionId ? await readQuoteRevision(revisionId) : undefined;
    if (!revision) {
      await deleteQuote(quoteId);
      return { error: "Could not duplicate this quote" };
    }
    const renders = sourceRevision?.renders
      ? await updateQuoteRevisionRenders(revision.id, sourceRevision.renders)
      : null;
    await createDealQuote({ dealId: deal.id, quoteId });
    const saved = await readQuote(quoteId);
    const activity = await recordDuplicatedQuoteActivity({
      dealId: deal.id,
      name: saved?.quoteNumber
        ? quoteDisplayName(saved.quoteNumber, describeSelections(saved.selections).specs)
        : portalCopy.quote,
      conversationId: parsed.data.conversationId,
    });
    revalidateConversations();
    revalidatePath("/quotes");
    revalidatePath("/deals");
    return {
      success: true,
      data: {
        id: quoteId,
        invoiceId,
        quoteNumber: saved?.quoteNumber,
        revisionId: revision.id,
        revisionNumber: revision.revisionNumber,
        createdAt: revision.createdAt,
        updatedAt: revision.updatedAt,
        renders,
        activity,
      },
    };
  } catch (error) {
    void recordCrmLog({ feature: "quotes", error });
    if (quoteId) await deleteQuote(quoteId).catch(() => undefined);
    if (missingDealQuotes(error)) return { error: "Could not duplicate this quote" };
    const message = error instanceof Error ? error.message : "Could not duplicate this quote";
    return { error: message };
  }
}

export async function cancelQuote(input: { quoteId: string }): Promise<{ success: true } | { error: string }> {
  const parsed = cancelQuoteSchema.safeParse(input);
  if (!parsed.success) return { error: "A quote is required" };

  try {
    const quote = await readQuote(parsed.data.quoteId);
    if (!quote) return { error: "Quote was not found" };
    await setQuoteStatus(quote.id, "voided");
    revalidateConversations();
    revalidatePath("/quotes");
    revalidatePath("/deals");
    revalidatePath(`/quote/${quote.id}`);
    return { success: true };
  } catch (error) {
    void recordCrmLog({ feature: "quotes", error });
    const message = error instanceof Error ? error.message : "Could not cancel this quote";
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
    revalidateConversations();
    revalidatePath("/quotes");
    revalidatePath("/deals");
    return { success: true, data: { revisionId: revision.id } };
  } catch (error) {
    void recordCrmLog({ feature: "quotes", error });
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
    await setQuoteStatus(parsed.data.quoteId, "deposit_paid");
    revalidateConversations();
    revalidatePath("/quotes");
    revalidatePath("/deals");
    revalidatePath(`/quote/${parsed.data.quoteId}`);
    return { success: true };
  } catch (error) {
    void recordCrmLog({ feature: "quotes", error });
    const message = error instanceof Error ? error.message : "Could not record this deposit";
    return { error: message };
  }
}

function revalidateQuote(quoteId: string) {
  revalidateConversations();
  revalidatePath("/quotes");
  revalidatePath("/deals");
  revalidatePath(`/quote/${quoteId}`);
}

async function quoteIdsOnDeal(dealId: string, primaryQuoteId: string): Promise<string[]> {
  const links = await readDealQuotes(dealId);
  const ids = links.map((link) => link.quoteId);
  if (primaryQuoteId && !ids.includes(primaryQuoteId)) ids.unshift(primaryQuoteId);
  return ids;
}

export async function deleteDraftQuote(input: { quoteId: string }): Promise<{ success: true } | { error: string }> {
  const parsed = cancelQuoteSchema.safeParse(input);
  if (!parsed.success) return { error: "A quote is required" };

  try {
    const status = await readQuoteStatus(parsed.data.quoteId);
    if (status !== "draft") return { error: "Only a draft quote can be deleted" };
    const [primaryDeals, links] = await Promise.all([
      readDealsByQuoteId(parsed.data.quoteId),
      readDealQuotesForQuote(parsed.data.quoteId),
    ]);
    const seen = new Set(primaryDeals.map((deal) => deal.id));
    const extra = await readDealsByIds(links.map((link) => link.dealId).filter((id) => !seen.has(id)));
    const deals = [...primaryDeals, ...extra];
    for (const deal of deals) {
      const ids = await quoteIdsOnDeal(deal.id, deal.quoteId);
      if (ids.length < 2) return { error: "A deal needs to keep at least one quote" };
    }
    for (const deal of deals) {
      if (deal.quoteId === parsed.data.quoteId) await updateDeal(deal.id, { quoteId: null });
    }
    await deleteQuote(parsed.data.quoteId);
    revalidateQuote(parsed.data.quoteId);
    return { success: true };
  } catch (error) {
    void recordCrmLog({ feature: "quotes", error });
    const message = error instanceof Error ? error.message : "Could not delete this draft";
    return { error: message };
  }
}

export async function renewQuote(input: { quoteId: string }): Promise<{ success: true } | { error: string }> {
  const parsed = cancelQuoteSchema.safeParse(input);
  if (!parsed.success) return { error: "A quote is required" };

  try {
    const status = await readQuoteStatus(parsed.data.quoteId);
    if (status !== "expired") return { error: "Only an expired quote can be renewed" };
    await setQuoteStatus(parsed.data.quoteId, "draft");
    revalidateQuote(parsed.data.quoteId);
    return { success: true };
  } catch (error) {
    void recordCrmLog({ feature: "quotes", error });
    const message = error instanceof Error ? error.message : "Could not renew this quote";
    return { error: message };
  }
}

export async function signQuoteAgreement(
  input: unknown,
): Promise<{ success: true; data: { status: QuoteStatus } } | { error: string }> {
  const parsed = payQuoteDepositSchema.safeParse(input);
  if (!parsed.success) return { error: "A quote is required" };

  try {
    const status = await readQuoteStatus(parsed.data.quoteId);
    if (status !== "sent" && status !== "viewed") return { error: "This quote cannot be signed" };
    await setQuoteStatus(parsed.data.quoteId, "signed");
    revalidateQuote(parsed.data.quoteId);
    return { success: true, data: { status: "signed" } };
  } catch (error) {
    void recordCrmLog({ feature: "quotes", error });
    const message = error instanceof Error ? error.message : "Could not sign this agreement";
    return { error: message };
  }
}

export async function refreshQuoteLifecycle(
  input: unknown,
): Promise<{ success: true; data: { status: QuoteStatus } } | { error: string }> {
  const parsed = quoteLifecycleSchema.safeParse(input);
  if (!parsed.success) return { error: "A quote is required" };

  try {
    const status = await readQuoteStatus(parsed.data.quoteId);
    if (!status) return { error: "Quote was not found" };
    const revisionId = await readActiveRevisionId(parsed.data.quoteId);
    const revision = revisionId ? await readQuoteRevision(revisionId) : undefined;
    if (revision && quoteWindowExpired(status, revision.sharedQuoteAt)) {
      await setQuoteStatus(parsed.data.quoteId, "expired");
      revalidateQuote(parsed.data.quoteId);
      return { success: true, data: { status: "expired" } };
    }
    if (parsed.data.openedByCustomer && status === "sent") {
      await setQuoteStatus(parsed.data.quoteId, "viewed");
      revalidateQuote(parsed.data.quoteId);
      return { success: true, data: { status: "viewed" } };
    }
    return { success: true, data: { status } };
  } catch (error) {
    void recordCrmLog({ feature: "quotes", error });
    const message = error instanceof Error ? error.message : "Could not update this quote";
    return { error: message };
  }
}
