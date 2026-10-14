import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import { createActivities, readActivities } from "@/src/features/crm/conversations/db/activity";
import {
  conversationPatchSchema,
  conversationWriteSchema,
  type ActivityInsert,
  type Conversation,
  type ConversationSummary,
} from "@/src/features/crm/conversations/types";
import {
  toConversation,
  toConversationSummary,
  type ConversationRow,
  type ConversationSummaryRow,
} from "@/src/features/crm/conversations/utils/mappers";

function crm() {
  return db("crm");
}

const conversationColumns =
  "id, lookup_key, channel_key, chat_id, customer_id, deal_id, contract_sent";

async function findRow(
  column: "lookup_key" | "channel_key" | "chat_id",
  key: string,
): Promise<ConversationRow | undefined> {
  const { data, error } = await crm()
    .from("conversations")
    .select(conversationColumns)
    .eq(column, key)
    .order("updated_at", { ascending: false })
    .limit(1);
  throwIfError(error);
  return (data?.[0] as ConversationRow | undefined) ?? undefined;
}

export async function createConversation(input: {
  lookupKey: string;
  channelKey?: string;
  chatId?: string;
  customerId: string;
  dealId?: string;
  contractSent: boolean;
  activities: ActivityInsert[];
}): Promise<string> {
  const conversation = conversationWriteSchema.parse(input);
  const { data, error } = await crm()
    .from("conversations")
    .upsert(
      {
        lookup_key: conversation.lookupKey,
        channel_key: conversation.channelKey ?? null,
        chat_id: conversation.chatId ?? null,
        customer_id: conversation.customerId,
        deal_id: conversation.dealId ?? null,
        contract_sent: conversation.contractSent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "lookup_key" },
    )
    .select("id")
    .single();

  throwIfError(error);
  if (!data?.id || typeof data.id !== "string") throw new Error("Conversation was not saved");

  if (conversation.activities.length > 0) {
    await createActivities(data.id, conversation.activities);
  }
  return data.id;
}

export async function readConversation(key: string): Promise<Conversation | undefined> {
  const row =
    (await findRow("channel_key", key)) ??
    (await findRow("chat_id", key)) ??
    (await findRow("lookup_key", key));
  if (!row) return undefined;
  return toConversation(row, await readActivities(row.id));
}

export async function readConversationById(id: string): Promise<Conversation | undefined> {
  const { data, error } = await crm()
    .from("conversations")
    .select(`${conversationColumns}, created_at`)
    .eq("id", id)
    .maybeSingle();
  throwIfError(error);
  if (!data) return undefined;
  const row = data as ConversationRow;
  return toConversation(row, await readActivities(row.id));
}

export async function readConversationSummaryByCustomer(
  customerId: string,
): Promise<ConversationSummary | undefined> {
  const { data, error } = await crm()
    .from("conversations")
    .select(`${conversationColumns}, updated_at`)
    .eq("customer_id", customerId)
    .order("updated_at", { ascending: false })
    .limit(1);
  throwIfError(error);
  const row = data?.[0] as ConversationSummaryRow | undefined;
  if (!row) return undefined;
  return toConversationSummary(row);
}

export async function readConversationsForCustomer(customerId: string): Promise<Conversation[]> {
  const { data, error } = await crm()
    .from("conversations")
    .select(`${conversationColumns}, created_at`)
    .eq("customer_id", customerId)
    .order("updated_at", { ascending: false });
  throwIfError(error);
  const rows = (data ?? []) as ConversationRow[];
  const conversations = await Promise.all(
    rows.map(async (row) => toConversation(row, await readActivities(row.id))),
  );
  return conversations.filter((conversation): conversation is Conversation => conversation != null);
}

export async function readConversations(): Promise<ConversationSummary[]> {
  const { data, error } = await crm()
    .from("conversations")
    .select(`${conversationColumns}, updated_at`)
    .order("updated_at", { ascending: false });
  throwIfError(error);
  return ((data ?? []) as ConversationSummaryRow[])
    .map(toConversationSummary)
    .filter((summary): summary is ConversationSummary => summary != null);
}

export async function updateConversation(
  id: string,
  patch: { contractSent?: boolean },
): Promise<void> {
  const next = conversationPatchSchema.parse(patch);
  if (next.contractSent === undefined) return;
  const { error } = await crm()
    .from("conversations")
    .update({
      contract_sent: next.contractSent,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  throwIfError(error);
}

export async function deleteConversation(key: string): Promise<void> {
  const byKey = await crm().from("conversations").delete().eq("lookup_key", key).select("id");
  throwIfError(byKey.error);
  if ((byKey.data ?? []).length > 0) return;

  const row = (await findRow("channel_key", key)) ?? (await findRow("chat_id", key));
  if (!row) return;
  const deleted = await crm().from("conversations").delete().eq("id", row.id);
  throwIfError(deleted.error);
}
