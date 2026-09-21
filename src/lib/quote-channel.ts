export type QuoteChannel = "twilio" | "telegram";

export function quoteChannel(): QuoteChannel {
  const raw = process.env.QUOTE_CHANNEL?.trim().toLowerCase();
  if (raw === "telegram") return "telegram";
  return "twilio";
}
