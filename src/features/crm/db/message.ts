import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import { chatMessageSchema, type ChatMessage } from "@/src/features/crm/types";
import { toMessage, type MessageRow } from "@/src/features/crm/utils/mappers";

function crm() {
  return db("crm");
}

export async function createMessages(
  conversationId: string,
  messages: ChatMessage[],
): Promise<void> {
  const rows = zMessages(messages);
  if (rows.length === 0) return;

  const inserted = await crm().from("messages").insert(
    rows.map((message, position) => ({
      conversation_id: conversationId,
      position,
      role: message.role,
      body: message.text,
    })),
  );
  throwIfError(inserted.error);
}

export async function readMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await crm()
    .from("messages")
    .select("position, role, body")
    .eq("conversation_id", conversationId)
    .order("position", { ascending: true });
  throwIfError(error);
  return ((data ?? []) as MessageRow[])
    .map(toMessage)
    .filter((message): message is ChatMessage => message != null);
}

export async function updateMessages(
  conversationId: string,
  messages: ChatMessage[],
): Promise<void> {
  await deleteMessages(conversationId);
  await createMessages(conversationId, messages);
}

export async function deleteMessages(conversationId: string): Promise<void> {
  const { error } = await crm().from("messages").delete().eq("conversation_id", conversationId);
  throwIfError(error);
}

function zMessages(messages: ChatMessage[]): ChatMessage[] {
  return chatMessageSchema.array().parse(messages);
}
