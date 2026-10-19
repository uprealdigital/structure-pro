/**
 * Where Review & Send text messages are delivered.
 * "telegram" sends every text to the Telegram bot.
 * "sms" sends each text to that customer's phone.
 */
export const outboundTextTransport = "telegram" as "telegram" | "sms";
