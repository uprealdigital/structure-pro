import "server-only";

import { cache } from "react";
import { db, getSupabase } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import { describeSelections } from "@/src/features/cpq/utils/pricing";
import { readCustomers } from "@/src/features/crm/common/db/customer";
import { readDealCustomersForDeals } from "@/src/features/crm/common/db/deal-customer";
import { readDeals, readDealsByIds, readDealsByQuoteId } from "@/src/features/crm/deals/db/deal";
import { readDealQuotes, readDealQuotesForQuote } from "@/src/features/crm/deals/db/deal-quote";
import {
  readActiveRevisionId,
  readQuote,
  readQuoteStatus,
  readQuoteUpdatedAt,
} from "@/src/features/crm/quotes/db/quote";
import { readQuoteRevision } from "@/src/features/crm/quotes/db/quote-revision";
import {
  quoteChangeEventSchema,
  quoteListItemSchema,
  type QuoteChangeEvent,
  type QuoteChangeKind,
  type QuoteListItem,
  type QuotePortal,
  type QuotePortalCustomer,
  type QuotePortalRecipient,
} from "@/src/features/crm/quotes/types";
import { quoteDisplayName, quotePortalDealName } from "@/src/features/crm/quotes/utils/formatting";
import { toQuoteChangeEvent, toQuotePortal } from "@/src/features/crm/quotes/utils/mappers";

const quoteIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function crm() {
  return db("crm");
}

const quoteListSelect = `
  id,
  invoice_id,
  quote_number,
  status,
  created_at,
  quote_revision:quote_revisions!active_revision_id (
    id,
    revision_number,
    status,
    config
  ),
  deals!quote_id (
    id,
    name,
    customers!deal_customers (
      id,
      full_name
    )
  ),
  deal_quotes (
    deal:deals!deal_id (
      id,
      name,
      customers!deal_customers (
        id,
        full_name
      )
    )
  )
`;

export async function getQuotes(): Promise<QuoteListItem[]> {
  const { data, error } = await crm()
    .from("quotes")
    .select(quoteListSelect)
    .order("created_at", { ascending: false })
    .limit(50);

  throwIfError(error);
  return quoteListItemSchema.array().parse(data ?? []);
}

export async function getQuote(id: string): Promise<QuoteListItem | undefined> {
  const quoteId = id.trim();
  if (!quoteId) return undefined;
  const { data, error } = await crm()
    .from("quotes")
    .select(quoteListSelect)
    .eq("id", quoteId)
    .maybeSingle();

  throwIfError(error);
  if (!data) return undefined;
  return quoteListItemSchema.parse(data);
}

export const getQuotePortal = cache(async (id: string): Promise<QuotePortal | undefined> => {
  const quoteId = id.trim();
  if (!quoteId) return undefined;
  const quote = await readQuote(quoteId);
  if (!quote) return undefined;
  const activeRevisionId = await readActiveRevisionId(quoteId);
  if (!activeRevisionId) return undefined;
  const revision = await readQuoteRevision(activeRevisionId);
  if (!revision || revision.quoteId !== quoteId) return undefined;
  const [directDeals, quoteLinks] = await Promise.all([
    readDealsByQuoteId(quoteId),
    readDealQuotesForQuote(quoteId),
  ]);
  const attachedIds = new Set(directDeals.map((deal) => deal.id));
  const linkedDeals = await readDealsByIds(
    quoteLinks.map((link) => link.dealId).filter((id) => !attachedIds.has(id)),
  );
  const deals = [...directDeals, ...linkedDeals];
  const [links, customers] = await Promise.all([
    readDealCustomersForDeals(deals.map((deal) => deal.id)),
    readCustomers(),
  ]);
  const customerById = new Map(customers.map((customer) => [customer.id, customer]));
  const seen = new Set<string>();
  const quoteCustomers: QuotePortalCustomer[] = [];
  const recipients: QuotePortalRecipient[] = [];
  const ordered = [...links].sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary));
  for (const link of ordered) {
    const customer = customerById.get(link.customerId);
    if (!customer) continue;
    recipients.push({ dealId: link.dealId, isPrimary: link.isPrimary, customer });
    if (seen.has(link.customerId)) {
      if (link.isPrimary) {
        const existing = quoteCustomers.find((item) => item.id === link.customerId);
        if (existing) existing.primary = true;
      }
      continue;
    }
    seen.add(link.customerId);
    quoteCustomers.push({ id: customer.id, name: customer.fullName, primary: link.isPrimary });
  }
  const described = describeSelections(revision.selections);
  const primaryDeal = deals[0];
  const primaryLinks = primaryDeal ? await readDealQuotes(primaryDeal.id) : [];
  const quoteCount = new Set(
    [primaryDeal?.quoteId, ...primaryLinks.map((link) => link.quoteId)].filter((id): id is string => Boolean(id)),
  ).size;
  const status = (await readQuoteStatus(quote.id)) ?? revision.status;
  const won = deals.length > 0 && deals.every((deal) => deal.status === "deal_won");
  const confirmedAt = status === "deposit_paid" || won ? (await readQuoteUpdatedAt(quote.id)) ?? "" : "";
  return toQuotePortal({
    id: quote.id,
    invoiceId: quote.invoiceId,
    revisionId: revision.id,
    dealName: quote.quoteNumber
      ? quoteDisplayName(quote.quoteNumber, described.specs)
      : quotePortalDealName(deals, described.specs, quote.invoiceId),
    revisionNumber: revision.revisionNumber,
    createdAt: revision.createdAt,
    imageUrl: described.style.image,
    renders: revision.renders,
    monthly: described.estimate.rto,
    months: described.estimate.rtoMonths,
    lines: described.estimate.lines,
    specs: described.specs,
    total: described.estimate.total,
    zip: revision.selections.zip,
    won,
    confirmedAt,
    customers: quoteCustomers,
    recipients,
    dealIds: deals.map((deal) => deal.id),
    quoteCount,
    selections: revision.selections,
    communication: revision.communication,
    status,
  });
});

async function dealIdsForQuote(quoteId: string): Promise<string[]> {
  const [direct, links] = await Promise.all([readDealsByQuoteId(quoteId), readDealQuotesForQuote(quoteId)]);
  return [...new Set([...direct.map((deal) => deal.id), ...links.map((link) => link.dealId)])];
}

export function openQuoteStream(quoteId: string | undefined, signal: AbortSignal): ReadableStream<Uint8Array> {
  const scoped = quoteId?.trim();
  if (scoped && !quoteIdPattern.test(scoped)) {
    return new ReadableStream({
      start(controller) {
        controller.close();
      },
    });
  }

  const encoder = new TextEncoder();
  let finish = () => {};

  return new ReadableStream({
    cancel() {
      finish();
    },
    start(controller) {
      let closed = false;
      let live = false;
      const buffered: QuoteChangeEvent[] = [];
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

      function writeEvent(event: QuoteChangeEvent) {
        write(`data: ${JSON.stringify(event)}\n\n`);
      }

      function publish(kind: QuoteChangeKind, row: Parameters<typeof toQuoteChangeEvent>[1]) {
        const parsed = toQuoteChangeEvent(kind, row);
        if (!parsed) return;
        const event = quoteChangeEventSchema.safeParse(parsed);
        if (!event.success) return;
        void (event.data.status === "deposit_paid" ? dealIdsForQuote(event.data.id) : Promise.resolve([]))
          .then((dealIds) => {
            if (closed) return;
            const next = dealIds.length > 0 ? { ...event.data, dealIds } : event.data;
            if (live) writeEvent(next);
            else buffered.push(next);
          })
          .catch(() => {
            if (closed) return;
            if (live) writeEvent(event.data);
            else buffered.push(event.data);
          });
      }

      write(": connected\n\n");

      let supabase: ReturnType<typeof getSupabase>;
      let channel: ReturnType<ReturnType<typeof getSupabase>["channel"]>;
      try {
        supabase = getSupabase();
        const filter = scoped ? `id=eq.${scoped}` : undefined;
        channel = supabase.channel(`crm-quotes-${crypto.randomUUID()}`);
        for (const event of ["INSERT", "UPDATE", "DELETE"] as const) {
          const kind: QuoteChangeKind = event === "INSERT" ? "insert" : event === "UPDATE" ? "update" : "delete";
          channel = channel.on(
            "postgres_changes",
            { event, schema: "crm", table: "quotes", ...(filter ? { filter } : {}) },
            (payload) => {
              const row = kind === "delete" ? payload.old : payload.new;
              publish(kind, row);
            },
          );
        }
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

      signal.addEventListener("abort", finish, { once: true });
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          live = true;
          for (const event of buffered.splice(0)) writeEvent(event);
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") finish();
      });
    },
  });
}
