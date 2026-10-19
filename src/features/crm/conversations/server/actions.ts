"use server";

import { revalidatePath } from "next/cache";
import { demoChatId, sendTelegramMessage } from "@/src/common/lib/telegram/telegram.service";
import {
  conversationUnreadCount,
  createActivities,
  deleteActivityAt,
  deleteLatestActivity,
  markActivitiesReadAt,
  readActivities,
  updateActivitiesRead,
} from "@/src/features/crm/conversations/db/activity";
import { createConversation, deleteConversation, readConversationById, updateConversation } from "@/src/features/crm/conversations/db/conversation";
import {
  getConversation,
  getConversationInboxItem,
  getConversationWorkspace,
  getCustomerDeals,
  getCustomerInboxItem,
} from "@/src/features/crm/conversations/server/queries";
import {
  activeDealRequestSchema,
  activityInsertSchema,
  composerChannelSchema,
  conversationIdSchema,
  conversationReadUpdateSchema,
  visibleActivityReadSchema,
  customerDealsRequestSchema,
  type Activity,
  type ActivityInsert,
  type ConversationDealListItem,
  type ConversationInboxItem,
  type ConversationWorkspace,
} from "@/src/features/crm/conversations/types";
import { readCustomer, updateCustomer } from "@/src/features/crm/common/db/customer";
import { readDealCustomersForCustomer } from "@/src/features/crm/common/db/deal-customer";
import { readDeal, updateDeal } from "@/src/features/crm/deals/db/deal";
import { systemEventBody } from "@/src/features/crm/conversations/utils/formatting";
import { dealIdSchema, dealNameSchema, type DealStatus } from "@/src/features/crm/deals/types";
import { readQuoteRevision, updateQuoteRevision } from "@/src/features/crm/quotes/db/quote-revision";

export async function openConversation(input: {
  lookupKey: string;
  channelKey?: string;
  chatId?: string;
  customerId: string;
  contractSent: boolean;
  activities: ActivityInsert[];
}): Promise<{ id: string; created: boolean }> {
  return createConversation(input);
}

export async function ensureCustomerConversation(input: {
  customerId: string;
  dealId: string;
}): Promise<{ success: true; data: { item: ConversationInboxItem } } | { error: string }> {
  const parsed = activeDealRequestSchema.safeParse(input);
  if (!parsed.success) return { error: "Customer was not found" };

  try {
    const customer = await readCustomer(parsed.data.customerId);
    if (!customer) return { error: "Customer was not found" };
    const links = await readDealCustomersForCustomer(customer.id);
    if (!links.some((link) => link.dealId === parsed.data.dealId)) {
      return { error: "Deal was not found" };
    }

    await createConversation({
      lookupKey: customer.phone.trim() || customer.id,
      customerId: customer.id,
      contractSent: false,
      activities: [],
    });
    const item = await getCustomerInboxItem(customer.id, parsed.data.dealId);
    if (!item) return { error: "Conversation was not opened" };
    return { success: true, data: { item } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Conversation was not opened";
    return { error: message };
  }
}

export async function removeConversation(key: string): Promise<void> {
  await deleteConversation(key);
}

export async function appendActivity(
  conversationId: string,
  activity: ActivityInsert,
): Promise<void> {
  const id = conversationIdSchema.parse(conversationId);
  const row = activityInsertSchema.parse(activity);
  await createActivities(id, [row]);
  revalidatePath("/crm/conversations");
}

export async function removeLatestActivity(conversationId: string): Promise<void> {
  const id = conversationIdSchema.parse(conversationId);
  await deleteLatestActivity(id);
  revalidatePath("/crm/conversations");
}

export async function sendManualActivity(input: {
  conversationId: string;
  text: string;
  channel: unknown;
}): Promise<{ success: true; data: Activity } | { error: string }> {
  const conversationId = conversationIdSchema.safeParse(input.conversationId);
  const text = input.text.trim();
  const channel = composerChannelSchema.safeParse(input.channel);
  if (!conversationId.success || !text || !channel.success) {
    return { error: "A conversation, message, and channel are required" };
  }

  try {
    if (channel.data === "telegram") {
      const conversation = await readConversationById(conversationId.data);
      await sendTelegramMessage(conversation?.chatId?.trim() || demoChatId(), text);
    }
    const sentAt = new Date().toISOString();
    await createActivities(conversationId.data, [
      {
        role: "model",
        channel: channel.data,
        text,
        generatedBy: "manual",
        createdAt: sentAt,
        readAt: sentAt,
      },
    ]);
    const activity = (await readActivities(conversationId.data)).at(-1);
    if (!activity) return { error: "The message was not saved" };
    revalidatePath("/crm/conversations");
    return { success: true, data: activity };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send message";
    return { error: message };
  }
}

export async function saveAgentSession(
  conversationId: string,
  session: {
    contractSent: boolean;
    crmDealId: string;
  },
): Promise<void> {
  await updateConversation(conversationId, {
    contractSent: session.contractSent,
  });
  if (!session.contractSent) return;
  await updateDeal(session.crmDealId, { status: "partially_signed" });
}

export async function markDealLost(dealId: string): Promise<{ success: true } | { error: string }> {
  const id = dealIdSchema.safeParse(dealId);
  if (!id.success) return { error: "A deal is required" };

  try {
    await updateDeal(id.data, { status: "deal_lost" });
    revalidatePath("/crm/conversations");
    revalidatePath("/crm/deals");
    revalidatePath("/crm/quotes");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update deal";
    return { error: message };
  }
}

export async function reopenDeal(
  dealId: string,
): Promise<{ success: true; data: { status: DealStatus } } | { error: string }> {
  const id = dealIdSchema.safeParse(dealId);
  if (!id.success) return { error: "A deal is required" };

  try {
    const deal = await readDeal(id.data);
    if (!deal) return { error: "Deal was not found" };
    if (deal.status !== "deal_lost" || !deal.previousStatus) {
      return { error: "This deal cannot be reopened" };
    }
    await updateDeal(deal.id, { status: deal.previousStatus });
    revalidatePath("/crm/conversations");
    revalidatePath("/crm/deals");
    revalidatePath("/crm/quotes");
    return { success: true, data: { status: deal.previousStatus } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update deal";
    return { error: message };
  }
}

export async function sendConversationQuote(input: {
  quoteId: string;
  revisionId: string;
  dealId: string;
}): Promise<
  | { success: true; data: { revisionId: string; updatedAt: string; dealStatus: ConversationWorkspace["deal"]["status"] } }
  | { error: string }
> {
  const quoteId = input.quoteId.trim();
  const revisionId = input.revisionId.trim();
  const dealId = dealIdSchema.safeParse(input.dealId);
  if (!quoteId || !revisionId || !dealId.success) {
    return { error: "A quote, revision, and deal are required" };
  }

  try {
    const [revision, deal] = await Promise.all([
      readQuoteRevision(revisionId),
      readDeal(dealId.data),
    ]);
    if (!revision || revision.quoteId !== quoteId) return { error: "Quote revision was not found" };
    if (!deal) return { error: "Deal was not found" };

    const saved =
      revision.status === "sent" ? revision : await updateQuoteRevision(revision.id, { status: "sent" });
    const dealStatus = deal.status === "lead" ? "quote_sent" : deal.status;
    if (dealStatus !== deal.status) await updateDeal(deal.id, { status: dealStatus });

    revalidatePath("/crm/conversations");
    revalidatePath("/crm/quotes");
    revalidatePath("/crm/deals");
    revalidatePath(`/quote/${quoteId}`);
    return {
      success: true,
      data: { revisionId: saved.id, updatedAt: saved.updatedAt, dealStatus },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send quote";
    return { error: message };
  }
}

export async function renameDeal(input: {
  dealId: string;
  name: string;
}): Promise<{ success: true; data: { name: string } } | { error: string }> {
  const id = dealIdSchema.safeParse(input.dealId);
  const name = dealNameSchema.safeParse(input.name);
  if (!id.success || !name.success) return { error: "A deal and name are required" };

  try {
    const deal = await readDeal(id.data);
    if (!deal) return { error: "Deal was not found" };
    await updateDeal(deal.id, { name: name.data });
    revalidatePath("/crm/conversations");
    revalidatePath("/crm/deals");
    return { success: true, data: { name: name.data } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not rename deal";
    return { error: message };
  }
}

export async function setCustomerActiveDeal(input: {
  customerId: string;
  dealId: string;
}): Promise<{ success: true } | { error: string }> {
  const parsed = activeDealRequestSchema.safeParse(input);
  if (!parsed.success) return { error: "A customer and deal are required" };

  try {
    const [customer, links] = await Promise.all([
      readCustomer(parsed.data.customerId),
      readDealCustomersForCustomer(parsed.data.customerId),
    ]);
    if (!customer) return { error: "Customer was not found" };
    if (!links.some((link) => link.dealId === parsed.data.dealId)) {
      return { error: "Deal was not found" };
    }
    await updateCustomer(parsed.data.customerId, { activeDealId: parsed.data.dealId });
    revalidatePath("/crm/conversations");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update the active deal";
    return { error: message };
  }
}

export async function recordSystemActivity(input: {
  conversationId: string;
  kind: "deal" | "quote";
  name: string;
}): Promise<{ success: true; data: Activity } | { error: string }> {
  const conversationId = conversationIdSchema.safeParse(input.conversationId);
  const name = input.name.trim();
  if (!conversationId.success || (input.kind !== "deal" && input.kind !== "quote") || !name) {
    return { error: "A conversation and event are required" };
  }

  try {
    const sentAt = new Date().toISOString();
    const text = systemEventBody(input.kind, name);
    await createActivities(conversationId.data, [
      {
        role: "model",
        channel: "system",
        text,
        generatedBy: "manual",
        createdAt: sentAt,
        readAt: sentAt,
      },
    ]);
    const activity = (await readActivities(conversationId.data))
      .reverse()
      .find((item) => item.channel === "system" && item.text === text);
    if (!activity) return { error: "The event was not saved" };
    return { success: true, data: activity };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the event";
    return { error: message };
  }
}

export async function deleteConversationActivity(input: {
  conversationId: string;
  position: number;
}): Promise<{ success: true } | { error: string }> {
  const conversationId = conversationIdSchema.safeParse(input.conversationId);
  if (!conversationId.success || !Number.isInteger(input.position) || input.position < 0) {
    return { error: "A conversation and activity are required" };
  }

  try {
    await deleteActivityAt(conversationId.data, input.position);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not remove the event";
    return { error: message };
  }
}

export async function loadCustomerDeals(
  customerId: string,
): Promise<{ success: true; data: ConversationDealListItem[] } | { error: string }> {
  const parsed = customerDealsRequestSchema.safeParse({ customerId });
  if (!parsed.success) return { error: "A customer is required" };

  try {
    const deals = await getCustomerDeals(parsed.data.customerId);
    return { success: true, data: deals };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load deals";
    return { error: message };
  }
}

export async function markVisibleActivitiesRead(input: {
  conversationId: string;
  positions: number[];
}): Promise<
  { success: true; data: { readAt: string; positions: number[]; unread: boolean; unreadCount: number } } | { error: string }
> {
  const parsed = visibleActivityReadSchema.safeParse(input);
  if (!parsed.success) return { error: "A message is required" };

  try {
    const updated = await markActivitiesReadAt(parsed.data.conversationId, parsed.data.positions);
    const unreadCount = await conversationUnreadCount(parsed.data.conversationId);
    revalidatePath("/crm/conversations");
    return {
      success: true,
      data: { readAt: updated.readAt, positions: updated.positions, unread: unreadCount > 0, unreadCount },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update messages";
    return { error: message };
  }
}

export async function markConversationsRead(input: {
  conversationIds: string[];
  read: boolean;
}): Promise<
  { success: true; data: { counts: Array<{ conversationId: string; unreadCount: number }> } } | { error: string }
> {
  const parsed = conversationReadUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: "A conversation is required" };

  try {
    const counts = await updateActivitiesRead(parsed.data);
    revalidatePath("/crm/conversations");
    return { success: true, data: { counts } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update messages";
    return { error: message };
  }
}

export async function loadConversationInboxItem(
  id: string,
): Promise<{ success: true; data: ConversationInboxItem | null } | { error: string }> {
  const parsed = conversationIdSchema.safeParse(id);
  if (!parsed.success) return { error: "A conversation is required" };

  try {
    const item = await getConversationInboxItem(parsed.data);
    return { success: true, data: item ?? null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load conversation";
    return { error: message };
  }
}

export async function loadConversationWorkspace(
  id: string,
  dealId?: string,
): Promise<{ success: true; data: ConversationWorkspace | null } | { error: string }> {
  const parsed = conversationIdSchema.safeParse(id);
  if (!parsed.success) return { error: "A conversation is required" };
  const deal = typeof dealId === "string" ? dealIdSchema.safeParse(dealId) : undefined;
  if (deal && !deal.success) return { error: "A deal is required" };

  try {
    const workspace = await getConversationWorkspace(parsed.data, deal?.success ? deal.data : undefined);
    return { success: true, data: workspace ?? null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load conversation";
    return { error: message };
  }
}

export async function optOutCustomer(key: string): Promise<void> {
  const conversation = await getConversation(key);
  if (!conversation) return;
  await updateCustomer(conversation.customerId, { optedOut: true });
}
