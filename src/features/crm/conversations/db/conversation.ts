import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import { createActivities, readActivities } from "@/src/features/crm/conversations/db/activity";
import {
  conversationAddressSchema,
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
  "id, lookup_key, channel_key, chat_id, customer_id, contract_sent";

async function findRow(
  column: "lookup_key" | "channel_key" | "chat_id",
  key: string,
): Promise<ConversationRow | undefined> {
  const { data, error } = await crm()
    .from("conversations")
    .select(conversationColumns)
    .eq(column, key)
    .order("created_at", { ascending: true })
    .limit(1);
  throwIfError(error);
  return (data?.[0] as ConversationRow | undefined) ?? undefined;
}

export async function createConversation(input: {
  lookupKey: string;
  channelKey?: string;
  chatId?: string;
  customerId: string;
  contractSent: boolean;
  activities: ActivityInsert[];
}): Promise<{ id: string; created: boolean }> {
  const conversation = conversationWriteSchema.parse(input);
  const existing = await readConversationSummaryByCustomer(conversation.customerId);
  if (existing) {
    if (conversation.channelKey || conversation.chatId) {
      await updateConversationAddress(existing.id, {
        channelKey: conversation.channelKey,
        chatId: conversation.chatId,
      });
    }
    if (conversation.activities.length > 0) {
      await createActivities(existing.id, conversation.activities);
    }
    return { id: existing.id, created: false };
  }

  const { data, error } = await crm()
    .from("conversations")
    .insert({
      lookup_key: conversation.lookupKey,
      channel_key: conversation.channelKey ?? null,
      chat_id: conversation.chatId ?? null,
      customer_id: conversation.customerId,
      contract_sent: conversation.contractSent,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  throwIfError(error);
  if (!data?.id || typeof data.id !== "string") throw new Error("Conversation was not saved");

  if (conversation.activities.length > 0) {
    await createActivities(data.id, conversation.activities);
  }
  return { id: data.id, created: true };
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
    .select(`${conversationColumns}, created_at, updated_at`)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: true })
    .limit(1);
  throwIfError(error);
  const row = data?.[0] as ConversationSummaryRow | undefined;
  if (!row) return undefined;
  return toConversationSummary(row);
}

export async function readConversationSummariesForCustomer(
  customerId: string,
): Promise<ConversationSummary[]> {
  const { data, error } = await crm()
    .from("conversations")
    .select(`${conversationColumns}, created_at, updated_at`)
    .eq("customer_id", customerId)
    .order("updated_at", { ascending: false });
  throwIfError(error);
  return ((data ?? []) as ConversationSummaryRow[])
    .map(toConversationSummary)
    .filter((summary): summary is ConversationSummary => summary != null);
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
    .select(`${conversationColumns}, created_at, updated_at`)
    .order("updated_at", { ascending: false });
  throwIfError(error);
  return ((data ?? []) as ConversationSummaryRow[])
    .map(toConversationSummary)
    .filter((summary): summary is ConversationSummary => summary != null);
}

export async function updateConversationAddress(
  id: string,
  input: { channelKey?: string; chatId?: string },
): Promise<void> {
  const next = conversationAddressSchema.parse(input);
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (next.channelKey) row.channel_key = next.channelKey;
  if (next.chatId) row.chat_id = next.chatId;
  if (Object.keys(row).length === 1) return;
  const { error } = await crm().from("conversations").update(row).eq("id", id);
  throwIfError(error);
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
