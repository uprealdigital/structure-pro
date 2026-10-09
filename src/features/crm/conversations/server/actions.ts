"use server";

import { revalidatePath } from "next/cache";
import { createActivities, readActivities } from "@/src/features/crm/conversations/db/activity";
import { createConversation, deleteConversation, updateConversation } from "@/src/features/crm/conversations/db/conversation";
import { getConversation, getConversationWorkspace } from "@/src/features/crm/conversations/server/queries";
import {
  activityInsertSchema,
  composerChannelSchema,
  conversationIdSchema,
  type Activity,
  type ActivityInsert,
  type ConversationWorkspace,
} from "@/src/features/crm/conversations/types";
import { updateCustomer } from "@/src/features/crm/common/db/customer";
import { updateDeal } from "@/src/features/crm/deals/db/deal";

export async function openConversation(input: {
  lookupKey: string;
  chatId?: string;
  customerId: string;
  contractSent: boolean;
  activities: ActivityInsert[];
}): Promise<string> {
  return createConversation(input);
}

export async function removeConversation(key: string): Promise<void> {
  await deleteConversation(key);
}

export async function appendActivity(
  conversationId: string,
  activity: ActivityInsert,
): Promise<void> {
  const id = conversationIdSchema.parse(conversationId);
  const row = activityInsertSchema.parse(activity);
  await createActivities(id, [row]);
  revalidatePath("/crm/conversations");
}

export async function sendManualActivity(input: {
  conversationId: string;
  text: string;
  channel: unknown;
}): Promise<{ success: true; data: Activity } | { error: string }> {
  const conversationId = conversationIdSchema.safeParse(input.conversationId);
  const text = input.text.trim();
  const channel = composerChannelSchema.safeParse(input.channel);
  if (!conversationId.success || !text || !channel.success) {
    return { error: "A conversation, message, and channel are required" };
  }

  try {
    await createActivities(conversationId.data, [
      { role: "model", channel: channel.data, text, generatedBy: "manual" },
    ]);
    const activity = (await readActivities(conversationId.data)).at(-1);
    if (!activity) return { error: "The message was not saved" };
    revalidatePath("/crm/conversations");
    return { success: true, data: activity };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send message";
    return { error: message };
  }
}

export async function saveAgentSession(
  conversationId: string,
  session: {
    contractSent: boolean;
    crmDealId: string;
  },
): Promise<void> {
  await updateConversation(conversationId, {
    contractSent: session.contractSent,
  });
  if (!session.contractSent) return;
  await updateDeal(session.crmDealId, { status: "invoice_sent" });
}

export async function loadConversationWorkspace(
  id: string,
): Promise<{ success: true; data: ConversationWorkspace | null } | { error: string }> {
  const parsed = conversationIdSchema.safeParse(id);
  if (!parsed.success) return { error: "A conversation is required" };

  try {
    const workspace = await getConversationWorkspace(parsed.data);
    return { success: true, data: workspace ?? null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load conversation";
    return { error: message };
  }
}

export async function optOutCustomer(key: string): Promise<void> {
  const conversation = await getConversation(key);
  if (!conversation) return;
  await updateCustomer(conversation.customerId, { optedOut: true });
}
