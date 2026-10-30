import { demoChatId } from "@/src/common/lib/telegram/telegram.service";
import { inboundActivitySchema, type InboundActivityChannel } from "@/src/features/ai/types";
import { recordCrmLog } from "@/src/features/crm/common/db/log";
import { appendActivity } from "@/src/features/crm/conversations/server/actions";
import { getConversation, getConversationIdByPhone } from "@/src/features/crm/conversations/server/queries";

// Temporary demo routing. Inbound Telegram is recorded on this customer only.
const demoInboundPhone = "646-284-0831";

export async function recordInboundActivity(input: unknown): Promise<void> {
  const parsed = inboundActivitySchema.safeParse(input);
  if (!parsed.success) return;
  const text = parsed.data.text.trim();
  if (!text || text === "/start") return;

  const channelKey = await targetChannelKey(parsed.data.channel, parsed.data.channelKey);
  if (!channelKey) return;
  const conversationId = await conversationIdForChannel(parsed.data.channel, channelKey);
  if (!conversationId) return;

  await appendActivity(conversationId, {
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

async function conversationIdForChannel(
  channel: InboundActivityChannel,
  channelKey: string,
): Promise<string | undefined> {
  if (channel !== "telegram") {
    const existing = await getConversation(channelKey);
    return existing?.id;
  }

  const conversationId = await getConversationIdByPhone(demoInboundPhone);
  if (conversationId) return conversationId;

  await recordCrmLog({
    feature: "conversations",
    error: `Could not find conversation for ${demoInboundPhone}`,
  });
  return undefined;
}
