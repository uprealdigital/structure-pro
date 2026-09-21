import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isQuoteSelections } from "@/src/lib/selections";
import type { QuoteChatMessage, QuoteSession } from "@/src/lib/quote-types";

type QuoteMessageRow = {
  position: number;
  role: string;
  body: string;
};

type QuoteRow = {
  full_name: string;
  phone: string;
  email: string;
  chat_id: string | null;
  selections: unknown;
  invoice_id: string;
  contract_sent: boolean;
  opted_out: boolean;
  quote_messages: QuoteMessageRow[] | null;
};

let client: SupabaseClient | undefined;

function supabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Quote follow-ups need Supabase. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, run supabase/schema.sql in the SQL editor, then redeploy.",
    );
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

function sessionKey(session: QuoteSession): string {
  return session.chatId ?? session.phone;
}

function throwIfError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

function toMessage(row: QuoteMessageRow): QuoteChatMessage | undefined {
  if (row.role !== "user" && row.role !== "model") return undefined;
  if (typeof row.body !== "string") return undefined;
  return { role: row.role, text: row.body };
}

function toSession(row: QuoteRow): QuoteSession | undefined {
  if (!isQuoteSelections(row.selections)) return undefined;
  const messages = (row.quote_messages ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map(toMessage)
    .filter((message): message is QuoteChatMessage => message != null);

  return {
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    chatId: row.chat_id ?? undefined,
    selections: row.selections,
    invoiceId: row.invoice_id,
    messages,
    contractSent: row.contract_sent,
    optedOut: row.opted_out,
  };
}

export async function saveQuoteSession(session: QuoteSession): Promise<void> {
  const { error } = await supabase().rpc("save_quote_session", {
    payload: {
      lookup_key: sessionKey(session),
      full_name: session.fullName,
      phone: session.phone,
      email: session.email,
      chat_id: session.chatId ?? "",
      selections: session.selections,
      invoice_id: session.invoiceId,
      contract_sent: session.contractSent,
      opted_out: session.optedOut,
      messages: session.messages,
    },
  });
  throwIfError(error);
}

export async function getQuoteSession(key: string): Promise<QuoteSession | undefined> {
  const { data, error } = await supabase()
    .from("quotes")
    .select(
      "full_name, phone, email, chat_id, selections, invoice_id, contract_sent, opted_out, quote_messages(position, role, body)",
    )
    .eq("lookup_key", key)
    .maybeSingle();

  throwIfError(error);
  if (!data) return undefined;
  return toSession(data as QuoteRow);
}

export async function deleteQuoteSession(key: string): Promise<void> {
  const { error } = await supabase().from("quotes").delete().eq("lookup_key", key);
  throwIfError(error);
}
