import type { ShedConfig } from "@/src/config/shed-config";

export type QuoteSelections = ShedConfig & { zip: string };

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
  selections: QuoteSelections;
  invoiceId: string;
  messages: QuoteChatMessage[];
  contractSent: boolean;
  optedOut: boolean;
};
