"use server";

import { getConversationInbox } from "@/src/features/crm/conversations/server/queries";
import { getCustomerCount } from "@/src/features/crm/customers/server/queries";
import { getDealCount } from "@/src/features/crm/deals/server/queries";
import { getQuoteCount } from "@/src/features/crm/quotes/server/queries";

export type NavCounts = {
  conversationCount: number;
  dealCount: number;
  customerCount: number;
  quoteCount: number;
};

export async function loadNavCounts(): Promise<{ success: true; data: NavCounts } | { error: string }> {
  try {
    const [inbox, deals, customers, quotes] = await Promise.allSettled([
      getConversationInbox(),
      getDealCount(),
      getCustomerCount(),
      getQuoteCount(),
    ]);

    return {
      success: true,
      data: {
        conversationCount: inbox.status === "fulfilled" ? inbox.value.length : 0,
        dealCount: deals.status === "fulfilled" ? deals.value : 0,
        customerCount: customers.status === "fulfilled" ? customers.value : 0,
        quoteCount: quotes.status === "fulfilled" ? quotes.value : 0,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load navigation";
    return { error: message };
  }
}
