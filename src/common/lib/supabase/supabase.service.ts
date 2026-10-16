import { createRequire } from "node:module";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { RealtimeClientOptions } from "@supabase/realtime-js";

const nodeRequire = createRequire(import.meta.url);

function nodeWebSocket(): NonNullable<RealtimeClientOptions["transport"]> {
  const loaded = nodeRequire("ws") as
    | NonNullable<RealtimeClientOptions["transport"]>
    | { WebSocket?: NonNullable<RealtimeClientOptions["transport"]> };
  if (typeof loaded === "function") return loaded;
  if (typeof loaded === "object" && loaded && typeof loaded.WebSocket === "function") return loaded.WebSocket;
  throw new Error("The ws package did not load.");
}

let client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: nodeWebSocket() },
  });
  return client;
}

export function db(schema: "cpq" | "crm" | "ai") {
  return getSupabase().schema(schema);
}
