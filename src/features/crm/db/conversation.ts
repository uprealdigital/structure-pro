import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import { readMessages, updateMessages } from "@/src/features/crm/db/message";
import {
  conversationPatchSchema,
  conversationWriteSchema,
  type ChatMessage,
  type Conversation,
} from "@/src/features/crm/types";
import { toConversation, type ConversationRow } from "@/src/features/crm/utils/mappers";

function crm() {
  return db("crm");
}

async function findRow(column: "lookup_key" | "chat_id", key: string): Promise<ConversationRow | undefined> {
  const { data, error } = await crm()
    .from("conversations")
    .select("id, lookup_key, chat_id, crm_deal_id, cpq_quote_id, contract_sent")
    .eq(column, key)
    .order("updated_at", { ascending: false })
    .limit(1);
  throwIfError(error);
  return (data?.[0] as ConversationRow | undefined) ?? undefined;
}

export async function createConversation(input: {
  lookupKey: string;
  chatId?: string;
  crmDealId: string;
  cpqQuoteId: string;
  contractSent: boolean;
  messages: ChatMessage[];
}): Promise<string> {
  const conversation = conversationWriteSchema.parse(input);
  const { data, error } = await crm()
    .from("conversations")
    .upsert(
      {
        lookup_key: conversation.lookupKey,
        chat_id: conversation.chatId ?? null,
        crm_deal_id: conversation.crmDealId,
        cpq_quote_id: conversation.cpqQuoteId,
        contract_sent: conversation.contractSent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "lookup_key" },
    )
    .select("id")
    .single();

  throwIfError(error);
  if (!data?.id || typeof data.id !== "string") throw new Error("Conversation was not saved");

  await updateMessages(data.id, conversation.messages);
  return data.id;
}

export async function readConversation(key: string): Promise<Conversation | undefined> {
  const row = (await findRow("lookup_key", key)) ?? (await findRow("chat_id", key));
  if (!row) return undefined;
  return toConversation(row, await readMessages(row.id));
}

export async function updateConversation(
  id: string,
  patch: { contractSent?: boolean; messages?: ChatMessage[] },
): Promise<void> {
  const next = conversationPatchSchema.parse(patch);
  if (next.contractSent !== undefined) {
    const { error } = await crm()
      .from("conversations")
      .update({
        contract_sent: next.contractSent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    throwIfError(error);
  }

  if (!next.messages) return;

  await updateMessages(id, next.messages);
}

export async function deleteConversation(key: string): Promise<void> {
  const byKey = await crm().from("conversations").delete().eq("lookup_key", key);
  throwIfError(byKey.error);
  const byChat = await crm().from("conversations").delete().eq("chat_id", key);
  throwIfError(byChat.error);
}
