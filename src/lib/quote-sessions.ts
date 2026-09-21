import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isQuoteSelections } from "@/src/lib/selections";
import type { QuoteChatMessage, QuoteSession } from "@/src/lib/quote-types";

type QuoteMessageRow = {
  position: number;
  role: string;
  body: string;
};

type QuoteRow = {
  id: string;
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

function throwIfError(
  error: { message: string; code?: string; details?: string; hint?: string } | null,
): void {
  if (!error) return;
  const extra = [error.code, error.details, error.hint].filter(Boolean).join(" — ");
  throw new Error(extra ? `${error.message} (${extra})` : error.message);
}

function toMessage(row: QuoteMessageRow): QuoteChatMessage | undefined {
  if (row.role !== "user" && row.role !== "model") return undefined;
  if (typeof row.body !== "string") return undefined;
  return { role: row.role, text: row.body };
}

function messageRows(value: unknown): QuoteMessageRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is QuoteMessageRow => {
    if (!row || typeof row !== "object") return false;
    const item = row as QuoteMessageRow;
    return typeof item.role === "string" && typeof item.body === "string";
  });
}

function toSession(row: QuoteRow): QuoteSession | undefined {
  if (!isQuoteSelections(row.selections)) {
    console.error("Stored quote selections did not match the expected shape");
    return undefined;
  }
  const messages = messageRows(row.quote_messages)
    .slice()
    .sort((a, b) => Number(a.position) - Number(b.position))
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

const QUOTE_COLUMNS =
  "id, full_name, phone, email, chat_id, selections, invoice_id, contract_sent, opted_out";

async function loadMessages(quoteId: string): Promise<QuoteMessageRow[]> {
  const { data, error } = await supabase()
    .from("quote_messages")
    .select("position, role, body")
    .eq("quote_id", quoteId)
    .order("position", { ascending: true });

  throwIfError(error);
  return messageRows(data);
}

async function findQuote(column: "lookup_key" | "chat_id", key: string): Promise<QuoteRow | undefined> {
  const { data, error } = await supabase()
    .from("quotes")
    .select(QUOTE_COLUMNS)
    .eq(column, key)
    .order("updated_at", { ascending: false })
    .limit(1);

  throwIfError(error);
  return (data?.[0] as QuoteRow | undefined) ?? undefined;
}

export async function getQuoteSession(key: string): Promise<QuoteSession | undefined> {
  const row = (await findQuote("lookup_key", key)) ?? (await findQuote("chat_id", key));
  if (!row) return undefined;
  return toSession({ ...row, quote_messages: await loadMessages(row.id) });
}

export async function deleteQuoteSession(key: string): Promise<void> {
  const { error } = await supabase().from("quotes").delete().eq("lookup_key", key);
  throwIfError(error);
}
