import type { QuoteSession } from "@/src/lib/quote-types";

const sessions = new Map<string, QuoteSession>();

export function saveQuoteSession(session: QuoteSession): void {
  sessions.set(session.phone, session);
}

export function getQuoteSession(phone: string): QuoteSession | undefined {
  return sessions.get(phone);
}

export function deleteQuoteSession(phone: string): void {
  sessions.delete(phone);
}
