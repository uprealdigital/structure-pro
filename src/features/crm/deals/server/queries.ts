import "server-only";

import { cache } from "react";
import { getSupabase } from "@/src/common/lib/supabase/supabase.service";
import { getQuoteForPage } from "@/src/features/cpq/server/queries";
import { readCustomers } from "@/src/features/crm/common/db/customer";
import { readDealCustomers } from "@/src/features/crm/common/db/deal-customer";
import { readConversations } from "@/src/features/crm/conversations/db/conversation";
import { canonicalConversationByCustomer } from "@/src/features/crm/conversations/utils/conversations";
import { readDeal, readDeals } from "@/src/features/crm/deals/db/deal";
import {
  dealChangeEventSchema,
  type DealBoardItem,
  type DealChangeEvent,
  type DealChangeKind,
} from "@/src/features/crm/deals/types";
import { dealDetailLine, dealProductName } from "@/src/features/crm/deals/utils/formatting";
import { toDealBoardItem, toDealChangeEvent } from "@/src/features/crm/deals/utils/mappers";

const dealIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getDeal(id: string) {
  return readDeal(id);
}

export async function getDealCount(): Promise<number> {
  const deals = await readDeals();
  return deals.length;
}

export const getDealBoard = cache(async (): Promise<DealBoardItem[]> => {
  const [deals, conversations, customers, links] = await Promise.all([
    readDeals(),
    readConversations(),
    readCustomers(),
    readDealCustomers(),
  ]);
  const customerById = new Map(customers.map((customer) => [customer.id, customer]));
  const conversationByCustomer = canonicalConversationByCustomer(conversations);
  const customersByDeal = new Map<string, { customer: (typeof customers)[number]; isPrimary: boolean }[]>();
  for (const link of links) {
    const customer = customerById.get(link.customerId);
    if (!customer) continue;
    const related = customersByDeal.get(link.dealId) ?? [];
    related.push({ customer, isPrimary: link.isPrimary });
    customersByDeal.set(link.dealId, related);
  }

  const items: DealBoardItem[] = [];
  for (const deal of deals) {
    const related = (customersByDeal.get(deal.id) ?? []).sort(
      (left, right) => Number(right.isPrimary) - Number(left.isPrimary),
    );
    if (related.length === 0) continue;
    const conversation = conversationByCustomer.get(related[0]?.customer.id ?? "");
    const quote = deal.quoteId ? await getQuoteForPage(deal.quoteId) : undefined;
    const specs = quote?.summary.specs ?? [];
    const item = toDealBoardItem({
      deal,
      contactName: related.map((entry) => entry.customer.fullName).join(", "),
      productName: deal.name?.trim() || dealProductName(specs),
      detail: dealDetailLine(specs),
      valueLabel: quote?.summary.totalLabel ?? "",
      conversationId: conversation?.id,
    });
    if (item) items.push(item);
  }

  return items;
});

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
