import "server-only";

import { cache } from "react";
import { getSupabase } from "@/src/common/lib/supabase/supabase.service";
import { getQuoteForPage } from "@/src/features/cpq/server/queries";
import { readCustomer, readCustomers } from "@/src/features/crm/common/db/customer";
import {
  readDealCustomers,
  readDealCustomersForCustomer,
  readDealCustomersForDeals,
} from "@/src/features/crm/common/db/deal-customer";
import type { DealCustomer } from "@/src/features/crm/common/types";
import { getCustomer } from "@/src/features/crm/common/server/queries";
import {
  conversationUnreadCount,
  countUnreadActivities,
  readActivities,
  readActivitiesSince,
  readLatestActivity,
  readLatestMessageAt,
} from "@/src/features/crm/conversations/db/activity";
import {
  readConversation,
  readConversationById,
  readConversationSummariesForCustomer,
  readConversationSummaryByCustomer,
  readConversations,
} from "@/src/features/crm/conversations/db/conversation";
import {
  activityReadEventSchema,
  conversationDealOptionSchema,
  conversationSummarySchema,
  conversationWorkspaceSchema,
  type ActivityEvent,
  type ActivityReadEvent,
  type Conversation,
  type ConversationDealOption,
  type ConversationInboxItem,
  type ConversationQuote,
  type ConversationWorkspace,
} from "@/src/features/crm/conversations/types";
import { activityPreview, formatDealMenuDate, lastMessageAt, productTitle, unreadActivityCount } from "@/src/features/crm/conversations/utils/formatting";
import { canonicalConversationByCustomer } from "@/src/features/crm/conversations/utils/conversations";
import { orderedDealParticipants } from "@/src/features/crm/conversations/utils/participants";
import {
  toActivityEvent,
  toConversationDealListItem,
  toConversationInboxItem,
  toConversationQuote,
  toConversationQuoteRevision,
} from "@/src/features/crm/conversations/utils/mappers";
import { readDeal, readDeals, readDealsByIds } from "@/src/features/crm/deals/db/deal";
import { readDealQuotes } from "@/src/features/crm/deals/db/deal-quote";
import type { Deal } from "@/src/features/crm/deals/types";
import { priceSummary } from "@/src/features/cpq/utils/pricing";
import { readActiveRevisionId, readQuoteStatus, readQuotesByIds } from "@/src/features/crm/quotes/db/quote";
import { readQuoteRevisions } from "@/src/features/crm/quotes/db/quote-revision";
import type { ConversationQuoteRevision } from "@/src/features/crm/conversations/types";

export async function getConversation(key: string) {
  return readConversation(key);
}

export async function getConversationByCustomer(customerId: string) {
  const summaries = await readConversationSummariesForCustomer(customerId);
  return canonicalConversationByCustomer(summaries).get(customerId);
}

function byNewest(left: Deal, right: Deal): number {
  return (right.createdAt ?? "").localeCompare(left.createdAt ?? "");
}

function linkedDeals(links: DealCustomer[], deals: Deal[], customerId: string): Deal[] {
  const ids = new Set(links.filter((link) => link.customerId === customerId).map((link) => link.dealId));
  return deals.filter((deal) => ids.has(deal.id));
}

function latestPrimaryDeal(links: DealCustomer[], deals: Deal[], customerId: string): Deal | undefined {
  const ids = new Set(
    links.filter((link) => link.customerId === customerId && link.isPrimary).map((link) => link.dealId),
  );
  return deals.filter((deal) => ids.has(deal.id)).sort(byNewest)[0];
}

async function revisionsForQuote(
  quoteId: string,
  selections: NonNullable<ConversationDealOption["quote"]>["selections"],
): Promise<{ revisions: ConversationQuoteRevision[]; activeRevisionId: string | undefined }> {
  let rows: Awaited<ReturnType<typeof readQuoteRevisions>> = [];
  let activeRevisionId: string | undefined;
  try {
    [rows, activeRevisionId] = await Promise.all([
      readQuoteRevisions(quoteId),
      readActiveRevisionId(quoteId),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!/quote_revisions|active_revision_id|schema cache/i.test(message)) throw error;
    const fallback = toConversationQuoteRevision({
      id: quoteId,
      revisionNumber: 1,
      status: "draft",
      createdAt: "",
      updatedAt: "",
      selections,
    });
    return { revisions: fallback ? [fallback] : [], activeRevisionId: undefined };
  }
  const revisions = rows
    .map((row) =>
      toConversationQuoteRevision({
        id: row.id,
        revisionNumber: row.revisionNumber,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        selections: row.selections,
        configChanges: row.configChanges,
        communication: row.communication,
        renders: row.renders,
        sharedPhotosAt: row.sharedPhotosAt,
        sharedQuoteAt: row.sharedQuoteAt,
      }),
    )
    .filter((revision): revision is ConversationQuoteRevision => revision != null);
  if (revisions.length > 0) return { revisions, activeRevisionId };
  const fallback = toConversationQuoteRevision({
    id: activeRevisionId || quoteId,
    revisionNumber: 1,
    status: "draft",
    createdAt: "",
    updatedAt: "",
    selections,
  });
  return { revisions: fallback ? [fallback] : [], activeRevisionId };
}

async function quoteIdsForDeal(dealId: string, quoteId: string): Promise<string[]> {
  const links = await readDealQuotes(dealId);
  const ids = links.map((link) => link.quoteId);
  if (quoteId && !ids.includes(quoteId)) ids.unshift(quoteId);
  return ids.length > 0 ? ids : quoteId ? [quoteId] : [];
}

async function loadConversationQuote(quoteId: string): Promise<ConversationQuote | undefined> {
  const quoteRecord = await getQuoteForPage(quoteId);
  if (!quoteRecord) return undefined;
  const loaded = await revisionsForQuote(quoteRecord.id, quoteRecord.selections);
  const active =
    loaded.revisions.find((revision) => revision.id === loaded.activeRevisionId) ??
    loaded.revisions[loaded.revisions.length - 1];
  const storedStatus = await readQuoteStatus(quoteRecord.id);
  return toConversationQuote({
    id: quoteRecord.id,
    invoiceId: quoteRecord.invoiceId,
    quoteNumber: quoteRecord.quoteNumber,
    totalLabel: active?.totalLabel ?? quoteRecord.summary.totalLabel,
    specs: active?.specs ?? quoteRecord.summary.specs,
    lines: active?.lines ?? quoteRecord.summary.lines,
    imageUrl: active?.imageUrl ?? quoteRecord.summary.imageUrl,
    selections: active?.selections ?? quoteRecord.selections,
    activeRevisionId: active?.id ?? "",
    status: storedStatus ?? (loaded.revisions.some((revision) => revision.status === "sent") ? "sent" : "draft"),
    revisions: loaded.revisions,
  });
}

export async function getDealTitle(dealId: string): Promise<string | undefined> {
  const deal = await readDeal(dealId);
  if (!deal) return undefined;
  const title = (await dealOption(deal))?.title.trim();
  return title || undefined;
}

export async function getConversationDealOption(dealId: string): Promise<ConversationDealOption | undefined> {
  const deal = await readDeal(dealId);
  if (!deal) return undefined;
  return dealOption(deal);
}

async function dealOption(
  deal: Deal,
  thread?: Conversation,
): Promise<ConversationDealOption | undefined> {
  const quotes = (
    await Promise.all((await quoteIdsForDeal(deal.id, deal.quoteId)).map((id) => loadConversationQuote(id)))
  ).filter((quote): quote is ConversationQuote => quote != null);
  const quote = quotes.find((item) => item.id === deal.quoteId) ?? quotes[0];
  const option = conversationDealOptionSchema.safeParse({
    id: deal.id,
    title: deal.name?.trim() || productTitle(quote?.specs ?? []) || quote?.invoiceId || "",
    priceLabel: quote?.totalLabel ?? "",
    stage: deal.status,
    dateLabel: formatDealMenuDate(deal.createdAt ?? ""),
    deal,
    quote: quote ?? null,
    quotes,
    conversationId: thread?.id,
    activities: [],
  });
  return option.success ? option.data : undefined;
}

async function lightDealOptions(deals: Deal[]): Promise<ConversationDealOption[]> {
  if (deals.length === 0) return [];
  const idLists = await Promise.all(deals.map((deal) => quoteIdsForDeal(deal.id, deal.quoteId)));
  const quoteIds = [...new Set(idLists.flat())];
  const quotes = quoteIds.length > 0 ? await readQuotesByIds(quoteIds) : [];
  const quoteById = new Map(quotes.map((quote) => [quote.id, quote]));
  return deals.flatMap((deal, index) => {
    const ids = idLists[index] ?? [];
    const record = quoteById.get(deal.quoteId) ?? ids.map((id) => quoteById.get(id)).find((quote) => quote != null);
    const summary = record ? priceSummary(record.selections) : undefined;
    const option = conversationDealOptionSchema.safeParse({
      id: deal.id,
      title: deal.name?.trim() || productTitle(summary?.specs ?? []) || record?.invoiceId || "",
      priceLabel: summary?.totalLabel ?? "",
      stage: deal.status,
      dateLabel: formatDealMenuDate(deal.createdAt ?? ""),
      deal,
      quote: null,
      quotes: [],
    });
    return option.success ? [option.data] : [];
  });
}

export async function getUnreadActivityCount(): Promise<number> {
  return countUnreadActivities();
}

export const getConversationInbox = cache(async (): Promise<ConversationInboxItem[]> => {
  const [summaries, customers, links, deals] = await Promise.all([
    readConversations(),
    readCustomers(),
    readDealCustomers(),
    readDeals(),
  ]);
  const customerById = new Map(customers.map((customer) => [customer.id, customer]));
  const chosen = [...canonicalConversationByCustomer(summaries).values()].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
  const items: Array<ConversationInboxItem | undefined> = [];
  for (let index = 0; index < chosen.length; index += 6) {
    const chunk = await Promise.all(
      chosen.slice(index, index + 6).map(async (summary) => {
      const customer = customerById.get(summary.customerId);
      if (!customer) return undefined;
      const linked = linkedDeals(links, deals, customer.id).sort(byNewest);
      const active = customer.activeDealId
        ? linked.find((item) => item.id === customer.activeDealId)
        : undefined;
      const deal = active ?? latestPrimaryDeal(links, deals, customer.id) ?? linked[0];
      if (!deal) return undefined;
      const [latest, updatedAt, unreadCount] = await Promise.all([
        readLatestActivity(summary.id),
        readLatestMessageAt(summary.id),
        conversationUnreadCount(summary.id),
      ]);
      return toConversationInboxItem({
        summary,
        customer,
        deal,
        deals: linked,
        preview: activityPreview(latest),
        updatedAt,
        unread: unreadCount > 0,
        unreadCount,
      });
      }),
    );
    items.push(...chunk);
  }

  return items.filter((item): item is ConversationInboxItem => item != null);
});

export async function getCustomerInboxItem(
  customerId: string,
  dealId: string,
): Promise<ConversationInboxItem | undefined> {
  const [customer, summary, links, deals] = await Promise.all([
    readCustomer(customerId),
    readConversationSummaryByCustomer(customerId),
    readDealCustomers(),
    readDeals(),
  ]);
  if (!customer || !summary) return undefined;
  const linked = linkedDeals(links, deals, customer.id).sort(byNewest);
  const deal = linked.find((item) => item.id === dealId) ?? linked[0];
  if (!deal) return undefined;
  const activities = await readActivities(summary.id);
  return toConversationInboxItem({
    summary,
    customer,
    deal,
    deals: linked,
    preview: activityPreview(activities.at(-1)),
    updatedAt: lastMessageAt(activities),
    unread: unreadActivityCount(activities) > 0,
    unreadCount: unreadActivityCount(activities),
  });
}

export async function getConversationInboxItem(
  conversationId: string,
): Promise<ConversationInboxItem | undefined> {
  const conversation = await readConversationById(conversationId);
  if (!conversation) return undefined;
  const [customer, links, deals] = await Promise.all([
    readCustomer(conversation.customerId),
    readDealCustomers(),
    readDeals(),
  ]);
  if (!customer) return undefined;
  const linked = linkedDeals(links, deals, customer.id).sort(byNewest);
  const active = customer.activeDealId
    ? linked.find((item) => item.id === customer.activeDealId)
    : undefined;
  const deal = active ?? latestPrimaryDeal(links, deals, customer.id) ?? linked[0];
  if (!deal) return undefined;
  const updatedAt = lastMessageAt(conversation.activities) || conversation.createdAt || new Date(0).toISOString();
  const summary = conversationSummarySchema.safeParse({
    id: conversation.id,
    lookupKey: conversation.lookupKey,
    channelKey: conversation.channelKey,
    chatId: conversation.chatId,
    customerId: conversation.customerId,
    contractSent: conversation.contractSent,
    createdAt: conversation.createdAt,
    updatedAt,
  });
  if (!summary.success) return undefined;
  return toConversationInboxItem({
    summary: summary.data,
    customer,
    deal,
    deals: linked,
    preview: activityPreview(conversation.activities.at(-1)),
    updatedAt,
    unread: unreadActivityCount(conversation.activities) > 0,
    unreadCount: unreadActivityCount(conversation.activities),
  });
}

export function openActivityStream(since: string | undefined, signal: AbortSignal): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const cursor = since && !Number.isNaN(Date.parse(since)) ? since : undefined;
  let finish = () => {};

  return new ReadableStream({
    cancel() {
      finish();
    },
    start(controller) {
      let closed = false;
      let live = false;
      const buffered: ActivityEvent[] = [];
      const bufferedReads: ActivityReadEvent[] = [];
      const heartbeat = setInterval(() => {
        write(": heartbeat\n\n");
      }, 15_000);

      function write(chunk: string) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          finish();
        }
      }

      function writeEvent(event: ActivityEvent) {
        write(`data: ${JSON.stringify(event)}\n\n`);
      }

      function writeRead(event: ActivityReadEvent) {
        write(`event: read\ndata: ${JSON.stringify(event)}\n\n`);
      }

      function publishRead(row: { conversation_id?: unknown; position?: unknown; read_at?: unknown }) {
        const conversationId = row.conversation_id;
        const position = typeof row.position === "number" ? row.position : Number(row.position);
        if (typeof conversationId !== "string" || !Number.isInteger(position) || position < 0) return;
        void conversationUnreadCount(conversationId)
          .then((unreadCount) => {
            const event = activityReadEventSchema.safeParse({
              conversationId,
              position,
              readAt: typeof row.read_at === "string" && row.read_at ? row.read_at : null,
              unread: unreadCount > 0,
              unreadCount,
            });
            if (!event.success || closed) return;
            if (live) writeRead(event.data);
            else bufferedReads.push(event.data);
          })
          .catch(() => {
            // A missed read event is corrected the next time the count loads.
          });
      }

      write(": connected\n\n");

      let supabase: ReturnType<typeof getSupabase>;
      let channel: ReturnType<ReturnType<typeof getSupabase>["channel"]>;
      try {
        supabase = getSupabase();
        channel = supabase
          .channel(`crm-activities-${crypto.randomUUID()}`)
          .on("postgres_changes", { event: "INSERT", schema: "crm", table: "activities" }, (payload) => {
            const event = toActivityEvent(payload.new);
            if (!event) return;
            if (live) writeEvent(event);
            else buffered.push(event);
          })
          .on("postgres_changes", { event: "UPDATE", schema: "crm", table: "activities" }, (payload) => {
            publishRead(payload.new);
          });
      } catch {
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // The stream is already closed.
        }
        return;
      }

      finish = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        void supabase.removeChannel(channel);
        try {
          controller.close();
        } catch {
          // The stream is already closed.
        }
      };

      async function release() {
        if (closed) return;
        let caught: ActivityEvent[] = [];
        if (cursor) {
          try {
            caught = await readActivitiesSince(cursor);
          } catch {
            finish();
            return;
          }
        }
        if (closed) return;
        live = true;
        const pending = buffered.splice(0);
        for (const event of bufferedReads.splice(0)) writeRead(event);
        const seen = new Set<string>();
        for (const event of [...caught, ...pending]) {
          const key = `${event.conversationId}:${event.activity.position}`;
          if (seen.has(key)) continue;
          seen.add(key);
          writeEvent(event);
        }
      }

      signal.addEventListener("abort", finish, { once: true });
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") void release();
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") finish();
      });
    },
  });
}

export async function getConversationWorkspace(
  id: string,
  dealId?: string,
): Promise<ConversationWorkspace | undefined> {
  const conversation = await readConversationById(id);
  if (!conversation) return undefined;

  const customer = await readCustomer(conversation.customerId);
  if (!customer) return undefined;
  const links = await readDealCustomersForCustomer(customer.id);
  const deals = (await readDealsByIds(links.map((link) => link.dealId))).sort(byNewest);
  const primaryIds = new Set(links.filter((link) => link.isPrimary).map((link) => link.dealId));
  const focusedDeal =
    (dealId ? deals.find((deal) => deal.id === dealId) : undefined) ??
    (customer.activeDealId ? deals.find((deal) => deal.id === customer.activeDealId) : undefined) ??
    deals.find((deal) => primaryIds.has(deal.id)) ??
    deals[0];
  const [focusedOption, lightOptions] = await Promise.all([
    focusedDeal ? dealOption(focusedDeal, conversation) : undefined,
    lightDealOptions(deals.filter((deal) => deal.id !== focusedDeal?.id)),
  ]);
  const lightById = new Map(lightOptions.map((option) => [option.id, option]));
  const options = deals.flatMap((deal) => {
    if (deal.id === focusedDeal?.id) return focusedOption ? [focusedOption] : [];
    const light = lightById.get(deal.id);
    return light ? [light] : [];
  });
  if (options.length === 0) return undefined;

  const participantLinks = await readDealCustomersForDeals(options.map((option) => option.id));
  const [people, summaries] = await Promise.all([readCustomers(), readConversations()]);
  const customerById = new Map(people.map((person) => [person.id, person]));
  const conversationByCustomer = canonicalConversationByCustomer(summaries);
  const participants = orderedDealParticipants(
    participantLinks.flatMap((link) => {
      const person = customerById.get(link.customerId);
      if (!person) return [];
      const conversationId = conversationByCustomer.get(person.id)?.id;
      return [
        {
          dealId: link.dealId,
          isPrimary: link.isPrimary,
          ...(conversationId ? { conversationId } : {}),
          customer: person,
        },
      ];
    }),
  );

  const saved = customer.activeDealId
    ? options.find((option) => option.id === customer.activeDealId)
    : undefined;
  const focused =
    (dealId ? options.find((option) => option.id === dealId) : undefined) ??
    saved ??
    options.find((option) => primaryIds.has(option.id)) ??
    options[0];

  const workspace = conversationWorkspaceSchema.safeParse({
    id: conversation.id,
    contractSent: conversation.contractSent,
    createdAt: conversation.createdAt ?? "",
    customer,
    deal: focused.deal,
    deals: options,
    participants,
    activities: conversation.activities,
    quote: focused.quote,
  });
  return workspace.success ? workspace.data : undefined;
}

export async function getCustomerDeals(customerId: string) {
  const links = await readDealCustomersForCustomer(customerId);
  const [deals, summaries] = await Promise.all([
    readDealsByIds(links.map((link) => link.dealId)),
    readConversationSummariesForCustomer(customerId),
  ]);
  const quotes = await readQuotesByIds(deals.map((deal) => deal.quoteId));
  const quoteById = new Map(quotes.map((quote) => [quote.id, quote]));
  const conversationId = canonicalConversationByCustomer(summaries).get(customerId)?.id;
  return deals.flatMap((deal) => {
    const quote = quoteById.get(deal.quoteId);
    const item = toConversationDealListItem({
      deal,
      invoiceId: quote?.invoiceId,
      selections: quote?.selections,
      conversationId,
    });
    return item ? [item] : [];
  });
}

export async function getAgentSession(key: string) {
  const conversation = await getConversation(key);
  if (!conversation) return undefined;

  const customer = await getCustomer(conversation.customerId);
  if (!customer) throw new Error("Customer not found");
  if (customer.optedOut) return undefined;
  const links = await readDealCustomersForCustomer(customer.id);
  const deals = (await Promise.all(links.map((link) => readDeal(link.dealId)))).filter(
    (deal): deal is Deal => deal != null,
  );
  const deal = latestPrimaryDeal(links, deals, customer.id);
  if (!deal) throw new Error("Deal not found");

  if (!deal.quoteId) throw new Error("Quote not found");
  const quote = await getQuoteForPage(deal.quoteId);
  if (!quote) throw new Error("Quote not found");

  return {
    conversationId: conversation.id,
    session: {
      fullName: customer.fullName,
      phone: customer.phone,
      email: customer.email,
      chatId: conversation.chatId,
      invoiceId: quote.invoiceId,
      quoteId: deal.quoteId,
      crmDealId: deal.id,
      crmCustomerId: customer.id,
      specLines: quote.summary.specs.map((spec) => `- ${spec.label}: ${spec.value}`).join("\n"),
      total: quote.summary.total,
      brandName: quote.summary.brand.name,
      messages: conversation.activities
        .filter((activity) => activity.channel !== "system")
        .map((activity) => ({
          role: activity.role,
          text: activity.text,
        })),
      contractSent: conversation.contractSent,
    },
  };
}
