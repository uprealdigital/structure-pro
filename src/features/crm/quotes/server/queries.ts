import "server-only";

import { cache } from "react";
import { db, getSupabase } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import { readDealsByQuoteId } from "@/src/features/crm/deals/db/deal";
import { readDealQuotesForQuote } from "@/src/features/crm/deals/db/deal-quote";
import {
  quoteChangeEventSchema,
  quoteListItemSchema,
  quotePortalSchema,
  type LoadedQuotePortal,
  type QuoteChangeEvent,
  type QuoteChangeKind,
  type QuoteListItem,
} from "@/src/features/crm/quotes/types";
import { toQuoteChangeEvent } from "@/src/features/crm/quotes/utils/mappers";

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

const quotePortalCustomerSelect = `
  id,
  full_name,
  phone,
  email,
  opted_out,
  active_deal_id,
  created_at
`;

const quotePortalDealSelect = `
  id,
  quote_id,
  status,
  name,
  deal_customers (
    is_primary,
    customer:customers!customer_id (
      ${quotePortalCustomerSelect}
    )
  ),
  deal_quotes (
    quote_id
  )
`;

const quotePortalSelect = `
  id,
  invoice_id,
  quote_number,
  status,
  created_at,
  updated_at,
  quote_revision:quote_revisions!active_revision_id (
    id,
    revision_number,
    status,
    config,
    communication,
    renders,
    created_at
  ),
  deals!quote_id (
    ${quotePortalDealSelect}
  ),
  deal_quotes (
    deal:deals!deal_id (
      ${quotePortalDealSelect}
    )
  )
`;

export const getQuotePortal = cache(async (id: string): Promise<LoadedQuotePortal | undefined> => {
  const quoteId = id.trim();
  if (!quoteId) return undefined;
  const { data, error } = await crm()
    .from("quotes")
    .select(quotePortalSelect)
    .eq("id", quoteId)
    .maybeSingle();

  throwIfError(error);
  if (!data) return undefined;
  const quote = quotePortalSchema.parse(data);
  const revision = quote.quote_revision;
  if (!revision) return undefined;
  return { ...quote, quote_revision: revision };
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
