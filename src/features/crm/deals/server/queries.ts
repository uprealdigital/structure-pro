import "server-only";

import { getSupabase } from "@/src/common/lib/supabase/supabase.service";
import { readCustomers } from "@/src/features/crm/common/db/customer";
import { readDealCustomers } from "@/src/features/crm/common/db/deal-customer";
import { readDeal, readDeals } from "@/src/features/crm/deals/db/deal";
import {
  dealChangeEventSchema,
  dealListWireSchema,
  type DealChangeEvent,
  type DealChangeKind,
  type DealListWire,
} from "@/src/features/crm/deals/types";
import { toDealChangeEvent } from "@/src/features/crm/deals/utils/mappers";
import { readNestedQuotes } from "@/src/features/crm/quotes/server/queries";

const dealIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getDeal(id: string) {
  return readDeal(id);
}

export async function getDealCount(): Promise<number> {
  const deals = await readDeals();
  return deals.length;
}

export async function getDealList(): Promise<DealListWire[]> {
  const [deals, customers, links] = await Promise.all([readDeals(), readCustomers(), readDealCustomers()]);
  const customerById = new Map(customers.map((customer) => [customer.id, customer]));
  const customersByDeal = new Map<string, { id: string; fullName: string; isPrimary: boolean }[]>();
  for (const link of links) {
    const customer = customerById.get(link.customerId);
    if (!customer) continue;
    const related = customersByDeal.get(link.dealId) ?? [];
    related.push({ id: customer.id, fullName: customer.fullName, isPrimary: link.isPrimary });
    customersByDeal.set(link.dealId, related);
  }
  const quotes = await readNestedQuotes(deals.map((deal) => deal.quoteId));
  const items: DealListWire[] = [];
  for (const deal of deals) {
    const related = (customersByDeal.get(deal.id) ?? []).sort(
      (left, right) => Number(right.isPrimary) - Number(left.isPrimary),
    );
    if (related.length === 0) continue;
    const parsed = dealListWireSchema.safeParse({
      id: deal.id,
      name: deal.name,
      source: deal.source,
      status: deal.status,
      customers: related.map((entry) => ({ id: entry.id, full_name: entry.fullName })),
      quote: deal.quoteId ? (quotes.get(deal.quoteId) ?? null) : null,
    });
    if (parsed.success) items.push(parsed.data);
  }
  return items;
}

export function openDealStream(dealId: string | undefined, signal: AbortSignal): ReadableStream<Uint8Array> {
  const scoped = dealId?.trim();
  if (scoped && !dealIdPattern.test(scoped)) {
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
      const buffered: DealChangeEvent[] = [];
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

      function writeEvent(event: DealChangeEvent) {
        write(`data: ${JSON.stringify(event)}\n\n`);
      }

      function publish(kind: DealChangeKind, row: Parameters<typeof toDealChangeEvent>[1]) {
        const parsed = toDealChangeEvent(kind, row);
        if (!parsed?.status) return;
        const event = dealChangeEventSchema.safeParse(parsed);
        if (!event.success) return;
        if (live) writeEvent(event.data);
        else buffered.push(event.data);
      }

      write(": connected\n\n");

      let supabase: ReturnType<typeof getSupabase>;
      let channel: ReturnType<ReturnType<typeof getSupabase>["channel"]>;
      try {
        supabase = getSupabase();
        const filter = scoped ? `id=eq.${scoped}` : undefined;
        channel = supabase.channel(`crm-deals-${crypto.randomUUID()}`);
        for (const event of ["INSERT", "UPDATE", "DELETE"] as const) {
          const kind: DealChangeKind = event === "INSERT" ? "insert" : event === "UPDATE" ? "update" : "delete";
          channel = channel.on(
            "postgres_changes",
            { event, schema: "crm", table: "deals", ...(filter ? { filter } : {}) },
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
