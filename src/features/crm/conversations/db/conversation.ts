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

const conversationColumns = "id, lookup_key, chat_id, customer_id, contract_sent";

async function findRow(column: "lookup_key" | "chat_id", key: string): Promise<ConversationRow | undefined> {
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
  chatId?: string;
  customerId: string;
  contractSent: boolean;
  activities: ActivityInsert[];
}): Promise<string> {
  const conversation = conversationWriteSchema.parse(input);
  const { data, error } = await crm()
    .from("conversations")
    .upsert(
      {
        lookup_key: conversation.lookupKey,
        chat_id: conversation.chatId ?? null,
        customer_id: conversation.customerId,
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
  const row = (await findRow("lookup_key", key)) ?? (await findRow("chat_id", key));
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
  const byKey = await crm().from("conversations").delete().eq("lookup_key", key);
  throwIfError(byKey.error);
  const byChat = await crm().from("conversations").delete().eq("chat_id", key);
  throwIfError(byChat.error);
}
