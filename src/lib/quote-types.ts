import type { ShedConfig } from "@/src/config/catalog";

export type QuoteSelections = ShedConfig & { zip: string };

/** Same shape as src/config/default-config.json. */
export type StoredConfiguration = QuoteSelections & { lng: string };

export type QuoteContact = {
  fullName: string;
  phone: string;
  email: string;
};

export type QuoteChatMessage = {
  role: "user" | "model";
  text: string;
};

export type QuoteSession = QuoteContact & {
  chatId?: string;
  selections: QuoteSelections;
  invoiceId: string;
  messages: QuoteChatMessage[];
  contractSent: boolean;
  optedOut: boolean;
};
