import "server-only";

import { throwIfError } from "@/src/common/utils/error-handling";
import { db, getSupabase } from "@/src/common/lib/supabase/supabase.service";
import {
  dealChangeEventSchema,
  dealListItemSchema,
  type DealChangeEvent,
  type DealChangeKind,
  type DealListItem,
} from "@/src/features/crm/deals/types";
import { toDealChangeEvent } from "@/src/features/crm/deals/utils/mappers";

function crm() {
  return db("crm");
}

const dealIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const dealListSelect = `
  id,
  name,
  source,
  status,
  customers!deal_customers!inner (
    id,
    full_name
  ),
  quote:quotes!quote_id (
    id,
    quote_number,
    status,
    quote_revision:quote_revisions!active_revision_id (
      id,
      revision_number,
      status
    )
  )
`;

export async function getDeals(): Promise<DealListItem[]> {
  const { data, error } = await crm()
    .from("deals")
    .select(dealListSelect)
    .order("created_at", { ascending: true })
    .limit(50);

  throwIfError(error);
  return dealListItemSchema.array().parse(data ?? []);
}

export async function getDeal(id: string): Promise<DealListItem | undefined> {
  const dealId = id.trim();
  if (!dealId) return undefined;
  const { data, error } = await crm()
    .from("deals")
    .select(dealListSelect)
    .eq("id", dealId)
    .maybeSingle();

  throwIfError(error);
  if (!data) return undefined;
  return dealListItemSchema.parse(data);
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
