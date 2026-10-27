import { demoChatId, ensureTelegramWebhook, sendTelegramMessage } from "@/src/common/lib/telegram/telegram.service";
import { sendSms } from "@/src/common/lib/twilio/twilio.service";

export type NewQuoteMessage = {
  fullName: string;
  width: number;
  length: number;
  productTitle: string;
  total: number;
  companyName: string;
};

export type NewQuoteDelivery = {
  text: string;
  channel: "telegram" | "sms";
  chatId: string | null;
};

export function newQuoteMessage(input: NewQuoteMessage): string {
  const name = input.fullName.trim().split(/\s+/)[0] || "there";
  const total = input.total.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  const agent = process.env.COMPANY_CONTACT_NAME?.trim() || "Daniel";
  return `Hey ${name}, ${agent} from ${input.companyName} here. We just received a quote for a ${input.width}-by-${input.length} ${input.productTitle}, which comes out to about ${total}. When are you looking to get this done? Trying to get a bit more context so we can send the contract over.`;
}

export function prepareNewQuoteMessage(input: NewQuoteMessage): NewQuoteDelivery {
  const channel = process.env.QUOTE_CHANNEL?.trim().toLowerCase() === "telegram" ? "telegram" : "sms";
  return {
    text: newQuoteMessage(input),
    channel,
    chatId: channel === "telegram" ? demoChatId() : null,
  };
}

export async function sendNewQuoteMessage(input: {
  phone: string;
  delivery: NewQuoteDelivery;
}): Promise<void> {
  if (input.delivery.channel === "telegram") {
    const chatId = input.delivery.chatId?.trim();
    if (!chatId) throw new Error("TELEGRAM_CHAT_ID is not set");
    await ensureTelegramWebhook();
    await sendTelegramMessage(chatId, input.delivery.text);
    return;
  }
  await sendSms(input.phone, input.delivery.text);
}
