import type { QuoteSession } from "@/src/lib/quote-types";

const sessions = new Map<string, QuoteSession>();

function sessionKey(session: QuoteSession): string {
  return session.chatId ?? session.phone;
}

export function saveQuoteSession(session: QuoteSession): void {
  sessions.set(sessionKey(session), session);
}

export function getQuoteSession(key: string): QuoteSession | undefined {
  return sessions.get(key);
}

export function deleteQuoteSession(key: string): void {
  sessions.delete(key);
}
