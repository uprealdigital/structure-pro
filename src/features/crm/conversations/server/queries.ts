import "server-only";

import { throwIfError } from "@/src/common/utils/error-handling";
import { db, getSupabase } from "@/src/common/lib/supabase/supabase.service";
import { toE164 } from "@/src/common/utils/phone";
import { getQuoteForPage } from "@/src/features/cpq/server/queries";
import { readCustomerByPhone } from "@/src/features/crm/common/db/customer";
import { readDealCustomersForCustomer } from "@/src/features/crm/common/db/deal-customer";
import type { DealCustomer } from "@/src/features/crm/common/types";
import { getCustomer } from "@/src/features/crm/common/server/queries";
import {
  conversationUnreadCount,
  readActivitiesSince,
  readLatestConversationIdForChannel,
} from "@/src/features/crm/conversations/db/activity";
import {
  readConversation,
  readConversationSummariesForCustomer,
  readConversationSummaryByCustomer,
} from "@/src/features/crm/conversations/db/conversation";
import {
  activityReadEventSchema,
  conversationDealOptionSchema,
  conversationDetailSchema,
  conversationListItemSchema,
  type ActivityEvent,
  type ActivityReadEvent,
  type Conversation,
  type ConversationDealOption,
  type ConversationDetail,
  type ConversationListItem,
  type ConversationQuote,
} from "@/src/features/crm/conversations/types";
import { formatDealMenuDate, productTitle } from "@/src/features/crm/conversations/utils/formatting";
import { canonicalConversationByCustomer } from "@/src/features/crm/conversations/utils/conversations";
import {
  toActivityEvent,
  toConversationDealListItem,
  toConversationQuote,
  toConversationQuoteRevision,
} from "@/src/features/crm/conversations/utils/mappers";
import { readDeal, readDealsByIds } from "@/src/features/crm/deals/db/deal";
import { readDealQuotes } from "@/src/features/crm/deals/db/deal-quote";
import type { Deal } from "@/src/features/crm/deals/types";
import { readActiveRevisionId, readQuoteStatus, readQuotesByIds } from "@/src/features/crm/quotes/db/quote";
import { readQuoteRevisions } from "@/src/features/crm/quotes/db/quote-revision";
import type { ConversationQuoteRevision } from "@/src/features/crm/conversations/types";

export async function getLatestChannelConversationId(channel: "sms" | "telegram") {
  return readLatestConversationIdForChannel(channel);
}

export async function getConversationByCustomer(customerId: string) {
  const summaries = await readConversationSummariesForCustomer(customerId);
  return canonicalConversationByCustomer(summaries).get(customerId);
}

export async function getConversationIdByPhone(phone: string): Promise<string | undefined> {
  const normalized = toE164(phone);
  if (!normalized) return undefined;
  const customer = await readCustomerByPhone(normalized);
  if (!customer) return undefined;
  const summary = await readConversationSummaryByCustomer(customer.id);
  return summary?.id;
}

function byNewest(left: Deal, right: Deal): number {
  return (right.createdAt ?? "").localeCompare(left.createdAt ?? "");
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
  const [rows, activeRevisionId] = await Promise.all([
    readQuoteRevisions(quoteId),
    readActiveRevisionId(quoteId),
  ]);
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

export async function getConversationQuote(quoteId: string): Promise<ConversationQuote | undefined> {
  return loadConversationQuote(quoteId);
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

function crm() {
  return db("crm");
}

const conversationListSelect = `
  id,
  contract_sent,
  updated_at,
  customer:customers!customer_id!inner (
    id,
    full_name,
    phone,
    email,
    active_deal_id,
    deal_customers!inner (
      is_primary,
      deal:deals!deal_id (
        id,
        name,
        source,
        status,
        created_at
      )
    )
  ),
  activities (
    position,
    role,
    body,
    channel,
    generated_by,
    read_at,
    created_at,
    call:calls!call_id (
      id,
      direction,
      duration_seconds
    )
  )
`;

const conversationQuoteSelect = `
  id,
  invoice_id,
  quote_number,
  status,
  active_revision_id,
  quote_revisions!quote_id (
    id,
    revision_number,
    status,
    config,
    config_changes,
    communication,
    renders,
    shared_photos_at,
    shared_quote_at,
    created_at,
    updated_at
  )
`;

const conversationSelect = `
  id,
  contract_sent,
  created_at,
  customer:customers!customer_id!inner (
    id,
    full_name,
    phone,
    email,
    opted_out,
    active_deal_id,
    created_at,
    deal_customers!inner (
      is_primary,
      deal:deals!deal_id (
        id,
        quote_id,
        source,
        status,
        previous_status,
        name,
        viewed_at,
        created_at,
        quote:quotes!quote_id (
          ${conversationQuoteSelect}
        ),
        deal_quotes (
          quote:quotes!quote_id (
            ${conversationQuoteSelect}
          )
        ),
        deal_customers (
          is_primary,
          customer:customers!customer_id (
            id,
            full_name,
            phone,
            email,
            opted_out,
            active_deal_id,
            created_at,
            conversations (
              id
            )
          )
        )
      )
    )
  ),
  activities (
    position,
    role,
    body,
    channel,
    generated_by,
    read_at,
    created_at,
    call:calls!call_id (
      id,
      direction,
      duration_seconds,
      script_match,
      recording_url,
      transcript,
      external_id,
      started_at,
      ended_at
    )
  )
`;

export async function getConversations(): Promise<ConversationListItem[]> {
  const { data, error } = await crm()
    .from("conversations")
    .select(conversationListSelect)
    .order("updated_at", { ascending: false })
    .limit(50);

  throwIfError(error);
  return conversationListItemSchema.array().parse(data ?? []);
}

export async function getConversation(id: string): Promise<ConversationDetail | undefined> {
  const conversationId = id.trim();
  if (!conversationId) return undefined;
  const { data, error } = await crm()
    .from("conversations")
    .select(conversationSelect)
    .eq("id", conversationId)
    .maybeSingle();

  throwIfError(error);
  if (!data) return undefined;
  return conversationDetailSchema.parse(data);
}

async function readConversationListItem(
  column: "id" | "customer_id",
  value: string,
): Promise<ConversationListItem | undefined> {
  const { data, error } = await crm()
    .from("conversations")
    .select(conversationListSelect)
    .eq(column, value)
    .maybeSingle();

  throwIfError(error);
  if (!data) return undefined;
  return conversationListItemSchema.parse(data);
}

export async function getCustomerInboxItem(
  customerId: string,
  dealId: string,
): Promise<ConversationListItem | undefined> {
  const item = await readConversationListItem("customer_id", customerId);
  if (!item) return undefined;
  if (!item.customer.deal_customers.some((link) => link.deal.id === dealId)) return undefined;
  return item;
}

export async function getConversationInboxItem(
  conversationId: string,
): Promise<ConversationListItem | undefined> {
  return readConversationListItem("id", conversationId);
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
  const conversation = await readConversation(key);
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
