import { demoChatId } from "@/src/common/lib/telegram/telegram.service";
import { inboundActivitySchema, type InboundActivityChannel } from "@/src/features/ai/types";
import { appendActivity, attachConversationChannel } from "@/src/features/crm/conversations/server/actions";
import { getConversation, getLatestChannelConversationId } from "@/src/features/crm/conversations/server/queries";

export async function recordInboundActivity(input: unknown): Promise<void> {
  const parsed = inboundActivitySchema.safeParse(input);
  if (!parsed.success) return;
  const text = parsed.data.text.trim();
  if (!text || text === "/start") return;

  const channelKey = await targetChannelKey(parsed.data.channel, parsed.data.channelKey);
  if (!channelKey) return;
  const conversation = await conversationForChannel(parsed.data.channel, channelKey);
  if (!conversation) return;

  await appendActivity(conversation.id, {
    role: "user",
    channel: parsed.data.channel,
    text,
    generatedBy: "manual",
  });
}

async function targetChannelKey(channel: InboundActivityChannel, channelKey: string): Promise<string | undefined> {
  if (channel !== "telegram") return channelKey;
  return channelKey === demoChatId() ? channelKey : undefined;
}

async function conversationForChannel(channel: InboundActivityChannel, channelKey: string) {
  const existing = await getConversation(channelKey);
  if (existing) return existing;
  if (channel !== "telegram") return undefined;
  const conversationId = await getLatestChannelConversationId("telegram");
  if (!conversationId) return undefined;
  await attachConversationChannel(conversationId, { channelKey, chatId: channelKey });
  return getConversation(channelKey);
}
