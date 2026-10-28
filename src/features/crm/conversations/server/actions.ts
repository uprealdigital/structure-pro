"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { sendMail } from "@/src/common/utils/mail";
import { demoChatId, sendTelegramFile, sendTelegramMessage } from "@/src/common/lib/telegram/telegram.service";
import { sendSms } from "@/src/common/lib/twilio/twilio.service";
import { createSuggestion, readSuggestions, storeSuggestionPreview, updateSuggestion } from "@/src/features/ai/db/suggestion";
import { analyzeInboundIntent } from "@/src/features/ai/services/inbound-intent-analyzer.service";
import { summarizeDeal } from "@/src/features/ai/services/deal-summary.service";
import { dealSummaryRequestSchema } from "@/src/features/ai/types";
import { prepareNewQuoteMessage, sendNewQuoteMessage } from "@/src/features/ai/services/messaging-agent.service";
import type { SuggestionIntent } from "@/src/features/ai/types";
import { selectionHasConfigChanges } from "@/src/features/crm/conversations/utils/design-preview";
import { createDealQuote, deleteDealQuote, readDealQuotes } from "@/src/features/crm/deals/db/deal-quote";
import { describeSelections } from "@/src/features/cpq/utils/pricing";
import { readQuote, readQuotesByIds } from "@/src/features/crm/quotes/db/quote";
import type { QuoteSelections } from "@/src/features/cpq/types";
import type { ConfigChanges } from "@/src/features/crm/quotes/types";
import { outboundTextTransport } from "@/src/features/crm/conversations/config/outbound-text";
import { copy } from "@/src/features/crm/conversations/locales/en";
import {
  conversationUnreadCount,
  createActivities,
  deleteActivityAt,
  deleteLatestActivity,
  markActivitiesReadAt,
  readActivities,
  readActivityRefs,
  readActivityRefsByIds,
  updateActivitiesRead,
} from "@/src/features/crm/conversations/db/activity";
import { deleteAttachmentFile, readAttachmentFile, storeAttachmentFile } from "@/src/features/crm/conversations/db/attachment";
import {
  createConversation,
  deleteConversation,
  readConversationById,
  readConversationSummaryByCustomer,
  updateConversation,
  updateConversationAddress,
} from "@/src/features/crm/conversations/db/conversation";
import {
  getConversation,
  getConversationDealOption,
  getConversationInboxItem,
  getConversationWorkspace,
  getCustomerDeals,
  getCustomerInboxItem,
} from "@/src/features/crm/conversations/server/queries";
import {
  activeDealRequestSchema,
  moveQuoteToNewDealSchema,
  undoMoveQuoteToNewDealSchema,
  activityInsertSchema,
  composerChannelSchema,
  conversationIdSchema,
  conversationReadUpdateSchema,
  conversationSuggestionSchema,
  sendQuoteMessagesSchema,
  suggestionIdSchema,
  syncSuggestionsSchema,
  visibleActivityReadSchema,
  customerDealsRequestSchema,
  type Activity,
  type ActivityInsert,
  type ConversationDealListItem,
  type ConversationDealOption,
  type ConversationInboxItem,
  type ConversationSuggestion,
  type ConversationWorkspace,
} from "@/src/features/crm/conversations/types";
import { readCustomer, updateCustomer } from "@/src/features/crm/common/db/customer";
import { createDealCustomer, deleteDealCustomer, readDealCustomersForCustomer, readDealCustomersForDeal } from "@/src/features/crm/common/db/deal-customer";
import { assignDefaultDealName, createDeal, deleteDeal, readDeal, updateDeal } from "@/src/features/crm/deals/db/deal";
import { fileActivityText, imageActivityText } from "@/src/features/crm/conversations/utils/attachments";
import { emailActivityText } from "@/src/features/crm/conversations/utils/email-message";
import { systemEventBody } from "@/src/features/crm/conversations/utils/formatting";
import {
  emailHtml,
  fillReviewMessage,
  quoteRevisionPath,
  reviewMessageValues,
} from "@/src/features/crm/conversations/utils/review-message";
import type { Customer } from "@/src/features/crm/common/types";
import { dealIdSchema, dealNameSchema, type DealStatus } from "@/src/features/crm/deals/types";
import { defaultDealName } from "@/src/features/crm/deals/utils/naming";
import { canMarkDealLost } from "@/src/features/crm/deals/utils/status";
import { canMoveQuoteToNewDeal } from "@/src/features/crm/quotes/config/status";
import { markQuoteSent, readQuoteStatus, setQuoteStatus } from "@/src/features/crm/quotes/db/quote";
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

export async function attachConversationChannel(
  conversationId: string,
  input: { channelKey?: string; chatId?: string },
): Promise<void> {
  const id = conversationIdSchema.parse(conversationId);
  await updateConversationAddress(id, input);
  revalidatePath("/crm/conversations");
}

export async function removeLatestActivity(conversationId: string): Promise<void> {
  const id = conversationIdSchema.parse(conversationId);
  await deleteLatestActivity(id);
  revalidatePath("/crm/conversations");
}

export async function sendWebsiteQuoteMessage(input: {
  dealId: string;
  customerId: string;
}): Promise<{ channel: "twilio" | "telegram" }> {
  const dealId = dealIdSchema.parse(input.dealId);
  const customerId = input.customerId.trim();
  if (!customerId) throw new Error("Customer was not found");

  const deal = await readDeal(dealId);
  if (!deal || deal.source !== "quote") throw new Error("Deal was not found");
  const [customer, quote] = await Promise.all([readCustomer(customerId), readQuote(deal.quoteId)]);
  if (!customer) throw new Error("Customer was not found");
  if (!quote) throw new Error("Quote was not found");

  const described = describeSelections(quote.selections);
  const delivery = prepareNewQuoteMessage({
    fullName: customer.fullName,
    width: quote.selections.width,
    length: quote.selections.length,
    productTitle: described.style.productTitle,
    total: described.estimate.total,
    companyName: described.brand.name,
  });
  const loggedAt = deal.createdAt ?? new Date().toISOString();
  const leadAt = new Date(loggedAt).toISOString();
  const sentAt = new Date(Date.parse(leadAt) + 1).toISOString();
  const dealName = deal.name?.trim() || defaultDealName(deal.source, loggedAt);
  const channelKey = delivery.chatId ?? customer.phone;
  const opened = await openConversation({
    lookupKey: channelKey,
    channelKey,
    chatId: delivery.chatId ?? undefined,
    customerId: customer.id,
    contractSent: false,
    activities: [
      {
        role: "model",
        channel: "system",
        text: systemEventBody("created", dealName, deal.id),
        generatedBy: "manual",
        createdAt: leadAt,
        readAt: leadAt,
      },
      {
        role: "model",
        channel: delivery.channel,
        text: delivery.text,
        generatedBy: "ai",
        createdAt: sentAt,
      },
    ],
  });

  try {
    await sendNewQuoteMessage({ phone: customer.phone, delivery });
  } catch (error) {
    if (opened.created) await removeConversation(channelKey);
    else {
      await removeLatestActivity(opened.id);
      await removeLatestActivity(opened.id);
    }
    throw error;
  }

  revalidatePath("/crm/conversations");
  return { channel: delivery.channel === "telegram" ? "telegram" : "twilio" };
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

const maxAttachmentBytes = 20 * 1024 * 1024;

export async function storeManualAttachment(input: {
  id: string;
  file: File;
}): Promise<{ success: true } | { error: string }> {
  const file = input.file;
  if (!(file instanceof File) || file.size <= 0) return { error: copy.attachmentUploadFailed };
  if (file.size > maxAttachmentBytes) return { error: copy.attachmentTooLarge };
  try {
    await storeAttachmentFile({
      id: input.id,
      name: file.name.trim() || copy.attachment,
      type: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : copy.attachmentUploadFailed;
    return { error: message };
  }
}

export async function discardStoredAttachment(id: string): Promise<void> {
  await deleteAttachmentFile(id);
}

export async function sendStoredAttachment(input: {
  conversationId: string;
  channel: unknown;
  id: string;
  name: string;
  image?: boolean;
}): Promise<{ success: true; data: Activity } | { error: string }> {
  const conversationId = conversationIdSchema.safeParse(input.conversationId);
  const channel = composerChannelSchema.safeParse(input.channel);
  const name = input.name.trim() || copy.attachment;
  if (!conversationId.success || !channel.success || !input.id) {
    return { error: "A conversation, channel, and file are required" };
  }

  try {
    const stored = await readAttachmentFile(input.id);
    if (!stored) return { error: copy.attachmentUploadFailed };
    if (channel.data === "telegram") {
      const conversation = await readConversationById(conversationId.data);
      await sendTelegramFile(conversation?.chatId?.trim() || demoChatId(), {
        name,
        type: stored.type,
        bytes: stored.bytes,
      });
    }
    const sentAt = new Date().toISOString();
    await createActivities(conversationId.data, [
      {
        role: "model",
        channel: channel.data,
        text: input.image ? imageActivityText(input.id, name) : fileActivityText(input.id, name),
        generatedBy: "manual",
        createdAt: sentAt,
        readAt: sentAt,
      },
    ]);
    const activity = (await readActivities(conversationId.data)).at(-1);
    if (!activity) return { error: "The attachment was not saved" };
    if (!input.image) await deleteAttachmentFile(input.id).catch(() => undefined);
    revalidatePath("/crm/conversations");
    return { success: true, data: activity };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send attachment";
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
  await updateDeal(session.crmDealId, { status: "pending_deposit" });
  const deal = await readDeal(session.crmDealId);
  if (!deal?.quoteId) return;
  const status = await readQuoteStatus(deal.quoteId);
  if (status === "draft" || status === "sent" || status === "viewed" || status === "changes_requested") {
    await setQuoteStatus(deal.quoteId, "signed");
  }
}

export async function markDealLost(dealId: string): Promise<{ success: true } | { error: string }> {
  const id = dealIdSchema.safeParse(dealId);
  if (!id.success) return { error: "A deal is required" };

  try {
    const deal = await readDeal(id.data);
    if (!deal) return { error: "Deal was not found" };
    if (!canMarkDealLost(deal.status)) return { error: "This deal cannot be marked as lost" };
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

async function markDealQuoteChangesRequested(dealId: string) {
  const deal = await readDeal(dealId);
  if (!deal?.quoteId) return;
  const status = await readQuoteStatus(deal.quoteId);
  if (status !== "sent" && status !== "viewed") return;
  await setQuoteStatus(deal.quoteId, "changes_requested");
}

export async function sendConversationQuote(input: {
  quoteId: string;
  revisionId: string;
  dealId: string;
}): Promise<
  | {
      success: true;
      data: {
        revisionId: string;
        updatedAt: string;
        sharedQuoteAt: string | null;
        dealStatus: ConversationWorkspace["deal"]["status"];
      };
    }
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

    const sharedQuoteAt = new Date().toISOString();
    const saved = await updateQuoteRevision(revision.id, {
      status: revision.status === "draft" ? "sent" : revision.status,
      sharedQuoteAt,
    });
    await markQuoteSent(quoteId);
    const dealStatus = deal.status === "new_lead" ? "active_quote" : deal.status;
    if (dealStatus !== deal.status) await updateDeal(deal.id, { status: dealStatus });

    revalidatePath("/crm/conversations");
    revalidatePath("/crm/quotes");
    revalidatePath("/crm/deals");
    revalidatePath(`/quote/${quoteId}`);
    return {
      success: true,
      data: { revisionId: saved.id, updatedAt: saved.updatedAt, sharedQuoteAt: saved.sharedQuoteAt, dealStatus },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send quote";
    return { error: message };
  }
}

function uniqueIds(ids: string[]): string[] {
  return ids.filter((id, index) => id.trim() && ids.indexOf(id) === index);
}

async function conversationForCustomer(customer: Customer): Promise<string> {
  const existing = await readConversationSummaryByCustomer(customer.id);
  if (existing) return existing.id;
  const created = await createConversation({
    lookupKey: customer.phone.trim() || customer.id,
    customerId: customer.id,
    contractSent: false,
    activities: [],
  });
  return created.id;
}

async function recordOutbound(conversationId: string, channel: "email" | "sms", text: string) {
  const sentAt = new Date().toISOString();
  await createActivities(conversationId, [
    {
      role: "model",
      channel,
      text,
      generatedBy: "manual",
      createdAt: sentAt,
      readAt: sentAt,
    },
  ]);
}

async function currentQuoteLink(quoteId: string): Promise<string> {
  const headerStore = await headers();
  const host = (headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "").split(",")[0]?.trim() ?? "";
  const path = quoteRevisionPath(quoteId);
  if (!host) return path;
  const forwarded = headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwarded || (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}${path}`;
}

async function deliverText(body: string, phone: string) {
  if (outboundTextTransport === "telegram") {
    await sendTelegramMessage(demoChatId(), body);
    return;
  }
  await sendSms(phone, body);
}

export async function sendQuoteMessages(
  input: unknown,
): Promise<
  | {
      success: true;
      data: {
        revisionId: string;
        updatedAt: string;
        sharedQuoteAt: string | null;
        dealStatus: ConversationWorkspace["deal"]["status"];
      };
    }
  | { error: string }
> {
  const parsed = sendQuoteMessagesSchema.safeParse(input);
  if (!parsed.success) return { error: "A quote, deal, and message are required" };

  const { quoteId, revisionId, dealName, dealPrice, communication } = parsed.data;
  const emailIds = uniqueIds(communication.emailRecipientIds);
  const textIds = uniqueIds(communication.smsRecipientIds);
  if (emailIds.length === 0 && textIds.length === 0) return { error: copy.noRecipients };
  if (emailIds.length > 0 && !communication.subject.trim() && !communication.emailBody.trim()) {
    return { error: copy.emptyEmail };
  }
  if (textIds.length > 0 && !communication.smsBody.trim()) return { error: copy.emptyText };

  try {
    const ids = uniqueIds([...emailIds, ...textIds]);
    const customers = await Promise.all(ids.map((id) => readCustomer(id)));
    const byId = new Map<string, Customer>();
    ids.forEach((id, index) => {
      const customer = customers[index];
      if (customer) byId.set(id, customer);
    });

    const emailRecipients = emailIds.map((id) => byId.get(id));
    const textRecipients = textIds.map((id) => byId.get(id));
    if (emailRecipients.some((customer) => !customer) || textRecipients.some((customer) => !customer)) {
      return { error: copy.missingCustomer };
    }
    for (const customer of emailRecipients) {
      if (!customer?.email.trim()) return { error: copy.missingEmail(customer?.fullName || "A recipient") };
    }
    if (outboundTextTransport === "sms") {
      for (const customer of textRecipients) {
        if (!customer?.phone.trim()) return { error: copy.missingPhone(customer?.fullName || "A recipient") };
      }
    }

    const quoteLink = await currentQuoteLink(quoteId);
    for (const customer of emailRecipients) {
      if (!customer) continue;
      const values = reviewMessageValues(customer.fullName, dealName, dealPrice, quoteLink);
      const subject = fillReviewMessage(communication.subject, values).trim();
      const body = fillReviewMessage(communication.emailBody, values).trim();
      await sendMail({
        to: customer.email.trim(),
        subject,
        text: body,
        html: emailHtml(body),
      });
      const conversationId = await conversationForCustomer(customer);
      await recordOutbound(conversationId, "email", emailActivityText({ subject, body, attachments: [] }));
    }

    for (const customer of textRecipients) {
      if (!customer) continue;
      const values = reviewMessageValues(customer.fullName, dealName, dealPrice, quoteLink);
      const body = fillReviewMessage(communication.smsBody, values).trim();
      await deliverText(body, customer.phone.trim());
      const conversationId = await conversationForCustomer(customer);
      await recordOutbound(conversationId, "sms", body);
    }

    let latest: {
      revisionId: string;
      updatedAt: string;
      sharedQuoteAt: string | null;
      dealStatus: ConversationWorkspace["deal"]["status"];
    } | undefined;
    for (const dealId of parsed.data.dealIds) {
      const sent = await sendConversationQuote({ quoteId, revisionId, dealId });
      if ("error" in sent) return sent;
      latest = sent.data;
    }
    if (!latest) return { error: copy.sendQuoteError };
    revalidatePath("/crm/conversations");
    return { success: true, data: latest };
  } catch (error) {
    const message = error instanceof Error ? error.message : copy.sendQuoteError;
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

function missingOptionalQuote(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("quote_id") &&
    (message.includes("null value") || message.includes("not-null") || message.includes("not null"))
  );
}

export async function moveQuoteToNewDeal(input: {
  dealId: string;
  quoteId: string;
}): Promise<{ success: true; data: { dealId: string; name: string; wasPrimary: boolean } } | { error: string }> {
  const parsed = moveQuoteToNewDealSchema.safeParse(input);
  if (!parsed.success) return { error: "A deal and quote are required" };

  let createdId = "";
  try {
    const [deal, links, customers, status] = await Promise.all([
      readDeal(parsed.data.dealId),
      readDealQuotes(parsed.data.dealId),
      readDealCustomersForDeal(parsed.data.dealId),
      readQuoteStatus(parsed.data.quoteId),
    ]);
    if (!deal) return { error: "Deal was not found" };
    const quoteId = parsed.data.quoteId;
    const quoteIds = [
      ...new Set(
        [deal.quoteId, ...links.map((link) => link.quoteId)].filter((id): id is string => Boolean(id)),
      ),
    ];
    if (!quoteIds.includes(quoteId)) return { error: "Quote was not found" };
    if (!status || !canMoveQuoteToNewDeal(status, quoteIds.length)) {
      return { error: "This quote cannot be moved" };
    }
    if (customers.length === 0) return { error: "This deal has no customers" };

    const wasPrimary = deal.quoteId === quoteId;
    const remaining = quoteIds.filter((id) => id !== quoteId);
    const created = await createDeal({ quoteId, source: deal.source });
    createdId = created.id;
    await createDealQuote({ dealId: created.id, quoteId });
    for (const customer of customers) {
      await createDealCustomer({
        customerId: customer.customerId,
        dealId: created.id,
        isPrimary: customer.isPrimary,
      });
    }
    const name = (await assignDefaultDealName(created.id)) ?? created.name ?? "";
    if (wasPrimary) {
      await updateDeal(deal.id, { quoteId: remaining[0] ?? null });
    }
    await deleteDealQuote({ dealId: deal.id, quoteId });
    createdId = "";
    for (const customer of customers) {
      const person = await readCustomer(customer.customerId);
      if (person?.activeDealId === deal.id) {
        await updateCustomer(person.id, { activeDealId: created.id });
      }
    }
    revalidatePath("/crm/conversations");
    revalidatePath("/crm/quotes");
    revalidatePath("/crm/deals");
    return { success: true, data: { dealId: created.id, name, wasPrimary } };
  } catch (error) {
    if (createdId) await deleteDeal(createdId).catch(() => undefined);
    if (missingOptionalQuote(error)) {
      return { error: "Run supabase/migrate-crm-deal-optional-quote.sql in the Supabase SQL editor." };
    }
    const message = error instanceof Error ? error.message : "Could not move this quote";
    return { error: message };
  }
}

export async function undoMoveQuoteToNewDeal(input: {
  quoteId: string;
  sourceDealId: string;
  createdDealId: string;
  wasPrimary: boolean;
}): Promise<{ success: true } | { error: string }> {
  const parsed = undoMoveQuoteToNewDealSchema.safeParse(input);
  if (!parsed.success) return { error: "A quote and its deals are required" };

  try {
    const [source, created, createdLinks, customers] = await Promise.all([
      readDeal(parsed.data.sourceDealId),
      readDeal(parsed.data.createdDealId),
      readDealQuotes(parsed.data.createdDealId),
      readDealCustomersForDeal(parsed.data.createdDealId),
    ]);
    if (!source || !created) return { error: "Deal was not found" };
    const quoteId = parsed.data.quoteId;
    const createdQuoteIds = [
      ...new Set(
        [created.quoteId, ...createdLinks.map((link) => link.quoteId)].filter((id): id is string => Boolean(id)),
      ),
    ];
    if (createdQuoteIds.length !== 1 || createdQuoteIds[0] !== quoteId) {
      return { error: "This quote cannot be moved back" };
    }

    await createDealQuote({ dealId: source.id, quoteId });
    if (parsed.data.wasPrimary) await updateDeal(source.id, { quoteId });
    await deleteDealQuote({ dealId: created.id, quoteId });
    for (const customer of customers) {
      const person = await readCustomer(customer.customerId);
      if (person?.activeDealId === created.id) {
        await updateCustomer(person.id, { activeDealId: source.id });
      }
      await deleteDealCustomer(customer.customerId, created.id);
    }
    await deleteDeal(created.id);
    revalidatePath("/crm/conversations");
    revalidatePath("/crm/quotes");
    revalidatePath("/crm/deals");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not move this quote back";
    return { error: message };
  }
}

export async function markDealViewed(dealId: string): Promise<{ success: true } | { error: string }> {
  const parsed = dealIdSchema.safeParse(dealId);
  if (!parsed.success) return { error: "A deal is required" };

  try {
    await updateDeal(parsed.data, { viewedAt: new Date().toISOString() });
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update the deal";
    return { error: message };
  }
}

export async function recordSystemActivity(input: {
  conversationId: string;
  kind: "deal" | "quote" | "activeQuote" | "created" | "renamed" | "savedRevision";
  name: string;
  dealId?: string;
  previousName?: string;
}): Promise<{ success: true; data: Activity } | { error: string }> {
  const conversationId = conversationIdSchema.safeParse(input.conversationId);
  const name = input.name.trim();
  const dealId = input.dealId?.trim();
  const previousName = input.previousName?.trim();
  if (
    !conversationId.success ||
    (input.kind !== "deal" &&
      input.kind !== "quote" &&
      input.kind !== "activeQuote" &&
      input.kind !== "created" &&
      input.kind !== "renamed" &&
      input.kind !== "savedRevision") ||
    !name ||
    (input.kind === "created" && !dealId) ||
    (input.kind === "renamed" && !previousName) ||
    (input.kind === "savedRevision" && !previousName)
  ) {
    return { error: "A conversation and event are required" };
  }

  try {
    const sentAt = new Date().toISOString();
    const text = systemEventBody(input.kind, name, dealId, previousName);
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

export async function loadConversationDeal(
  dealId: string,
): Promise<{ success: true; data: ConversationDealOption | null } | { error: string }> {
  const parsed = dealIdSchema.safeParse(dealId);
  if (!parsed.success) return { error: "A deal is required" };

  try {
    const option = await getConversationDealOption(parsed.data);
    return { success: true, data: option ?? null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load deal";
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

const suggestionChannels = new Set(["sms", "telegram", "facebook", "email"]);

function hasConfigChanges(changes: ConfigChanges): boolean {
  return Object.keys(changes).length > 0;
}

async function dealRevisions(dealId: string): Promise<Array<{ name: string; selections: QuoteSelections }>> {
  const [deal, links] = await Promise.all([readDeal(dealId), readDealQuotes(dealId)]);
  const ids = [...new Set([deal?.quoteId, ...links.map((link) => link.quoteId)].filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return [];
  const quotes = await readQuotesByIds(ids);
  return quotes.map((quote, index) => ({
    name: quote.quoteNumber ? `Quote #${quote.quoteNumber}` : `Quote ${index + 1}`,
    selections: quote.selections,
  }));
}

function revisionChangesQuote(changes: ConfigChanges, selections: QuoteSelections[]): boolean {
  if (!hasConfigChanges(changes)) return false;
  if (selections.length === 0) return true;
  return selections.some((current) => selectionHasConfigChanges(current, changes));
}

async function pendingSuggestions(dealId: string): Promise<ConversationSuggestion[]> {
  const pending = (await readSuggestions(dealId)).filter((row) => row.status === "pending");
  const activities = await readActivityRefsByIds([...new Set(pending.flatMap((row) => row.messageIds))]);
  const textById = new Map(activities.map((row) => [row.id, row.body.trim()]));
  const order = new Map(activities.map((row) => [row.id, row.position]));
  return pending
    .flatMap((row) => {
      const messageIds = [...row.messageIds].sort((left, right) => (order.get(left) ?? 0) - (order.get(right) ?? 0));
      const messages = messageIds.map((id) => textById.get(id) ?? "").filter(Boolean);
      const suggestion = conversationSuggestionSchema.safeParse({
        id: row.id,
        intent: row.intent,
        configChanges: row.configChanges,
        previewImageUrl: row.previewImageUrl,
        summary: row.intent === "new_quote" ? messages.join(" ") : "",
        messages,
      });
      return suggestion.success ? [suggestion.data] : [];
    })
    .sort((left, right) => Number(left.intent === "new_quote") - Number(right.intent === "new_quote"));
}

export async function summarizeConversationDeal(
  input: unknown,
): Promise<{ success: true; data: string } | { error: string }> {
  const parsed = dealSummaryRequestSchema.safeParse(input);
  if (!parsed.success) return { error: "A deal summary needs the current deal" };

  try {
    const summary = await summarizeDeal(parsed.data);
    return { success: true, data: summary };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not summarize the deal";
    return { error: message };
  }
}

export async function syncConversationSuggestions(
  input: unknown,
): Promise<{ success: true; data: ConversationSuggestion[] } | { error: string }> {
  const parsed = syncSuggestionsSchema.safeParse(input);
  if (!parsed.success) return { error: "A deal and its messages are required" };

  try {
    const refs = await readActivityRefs(parsed.data.conversationId, parsed.data.positions);
    const inbound = refs
      .filter((row) => row.role === "user" && suggestionChannels.has(row.channel) && row.body.trim())
      .sort((left, right) => left.position - right.position);
    const existing = await readSuggestions(parsed.data.dealId);
    const frozen = new Set(existing.filter((row) => row.status !== "pending").flatMap((row) => row.messageIds));
    const pending = existing.filter((row) => row.status === "pending");
    const covered = new Set(pending.flatMap((row) => row.messageIds));
    const candidates = inbound.filter((row) => !frozen.has(row.id));
    const uncovered = candidates.filter((row) => !covered.has(row.id));
    const staleRevision = pending.some(
      (row) => row.intent === "revision" && !hasConfigChanges(row.configChanges) && row.messageIds.some((id) => !frozen.has(id)),
    );
    const revisions = await dealRevisions(parsed.data.dealId);
    const quoteSelections = revisions.map((revision) => revision.selections);
    if (uncovered.length > 0 || staleRevision) {
      const pendingIds = pending.flatMap((row) => row.messageIds).filter((id) => !frozen.has(id));
      const known = new Set(candidates.map((row) => row.id));
      const older = await readActivityRefsByIds(pendingIds.filter((id) => !known.has(id)));
      const analyzed = [...older, ...candidates]
        .filter((row) => row.body.trim())
        .sort((left, right) => left.position - right.position)
        .slice(-40);
      const currentChanges = pending.find((row) => row.intent === "revision")?.configChanges ?? {};
      const hits = await analyzeInboundIntent({
        messages: analyzed.map((row) => row.body.trim()),
        currentChanges,
        revisions,
      });
      const order = new Map(analyzed.map((row) => [row.id, row.position]));
      for (const hit of hits) {
        const intent: SuggestionIntent = hit.kind === "configuration" ? "revision" : "new_quote";
        const messageIds = [
          ...new Set(
            hit.messageIndexes.flatMap((index) => {
              const id = analyzed[index]?.id;
              return typeof id === "number" && !frozen.has(id) ? [id] : [];
            }),
          ),
        ];
        if (messageIds.length === 0) continue;
        const current = pending.find((row) => row.intent === intent);
        const combined = [...new Set([...(current?.messageIds ?? []).filter((id) => !frozen.has(id)), ...messageIds])];
        combined.sort((left, right) => (order.get(left) ?? 0) - (order.get(right) ?? 0));
        if (combined.length > 40) combined.splice(0, combined.length - 40);
        const configChanges = intent === "revision" ? hit.configChanges : {};
        if (intent === "revision" && !revisionChangesQuote(configChanges, quoteSelections)) {
          if (!current) continue;
          await updateSuggestion(current.id, { status: "dismissed" });
          const index = pending.indexOf(current);
          if (index >= 0) pending.splice(index, 1);
          continue;
        }
        if (intent === "revision") await markDealQuoteChangesRequested(parsed.data.dealId);
        if (current) {
          const saved = await updateSuggestion(current.id, { messageIds: combined, configChanges });
          if (!saved) continue;
          current.messageIds = combined;
          current.configChanges = saved.configChanges;
          continue;
        }
        const created = await createSuggestion({
          dealId: parsed.data.dealId,
          messageIds: combined,
          intent,
          configChanges,
        });
        pending.push(created);
      }
    }
    for (const row of pending) {
      if (row.intent !== "revision" || revisionChangesQuote(row.configChanges, quoteSelections)) continue;
      await updateSuggestion(row.id, { status: "dismissed" });
    }
    return { success: true, data: await pendingSuggestions(parsed.data.dealId) };
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Could not read these messages";
    return { error: message };
  }
}

export async function saveSuggestionPreview(
  formData: FormData,
): Promise<{ success: true; data: { previewImageUrl: string } } | { error: string }> {
  const id = formData.get("id");
  const file = formData.get("file");
  const parsed = suggestionIdSchema.safeParse({ id });
  if (!parsed.success || !(file instanceof Blob) || file.size <= 0 || file.size > 2 * 1024 * 1024) {
    return { error: "A preview image is required" };
  }
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const png =
      bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    if (!png) return { error: "A preview image is required" };
    const saved = await storeSuggestionPreview(parsed.data.id, bytes);
    if (!saved?.previewImageUrl) return { error: "Could not save the preview" };
    return { success: true, data: { previewImageUrl: saved.previewImageUrl } };
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Could not save the preview";
    return { error: message };
  }
}

export async function dismissConversationSuggestion(
  input: unknown,
): Promise<{ success: true; data: { id: string } } | { error: string }> {
  const parsed = suggestionIdSchema.safeParse(input);
  if (!parsed.success) return { error: "A suggestion is required" };
  try {
    const dismissed = await updateSuggestion(parsed.data.id, { status: "dismissed" });
    if (!dismissed) return { error: "Could not dismiss this suggestion" };
    revalidatePath("/crm/conversations");
    return { success: true, data: { id: dismissed.id } };
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Could not dismiss this suggestion";
    return { error: message };
  }
}

export async function restoreConversationSuggestion(
  input: unknown,
): Promise<{ success: true; data: { id: string } } | { error: string }> {
  const parsed = suggestionIdSchema.safeParse(input);
  if (!parsed.success) return { error: "A suggestion is required" };
  try {
    const restored = await updateSuggestion(parsed.data.id, { status: "pending" });
    if (!restored) return { error: "Could not restore this suggestion" };
    revalidatePath("/crm/conversations");
    return { success: true, data: { id: restored.id } };
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Could not restore this suggestion";
    return { error: message };
  }
}

export async function applyConversationSuggestion(
  input: unknown,
): Promise<{ success: true; data: { id: string } } | { error: string }> {
  const parsed = suggestionIdSchema.safeParse(input);
  if (!parsed.success) return { error: "A suggestion is required" };
  try {
    await updateSuggestion(parsed.data.id, { status: "applied" });
    revalidatePath("/crm/conversations");
    return { success: true, data: { id: parsed.data.id } };
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Could not apply this suggestion";
    return { error: message };
  }
}

export async function optOutCustomer(key: string): Promise<void> {
  const conversation = await getConversation(key);
  if (!conversation) return;
  await updateCustomer(conversation.customerId, { optedOut: true });
}
