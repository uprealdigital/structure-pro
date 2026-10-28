"use server";

import { recordCrmLog } from "@/src/features/crm/common/db/log";
import { getConversationInbox, getUnreadActivityCount } from "@/src/features/crm/conversations/server/queries";
import { getCustomerCount } from "@/src/features/crm/customers/server/queries";
import { getDealCount } from "@/src/features/crm/deals/server/queries";
import { getQuoteCount } from "@/src/features/crm/quotes/server/queries";

export type NavCounts = {
  conversationCount: number;
  unreadActivityCount: number;
  dealCount: number;
  customerCount: number;
  quoteCount: number;
};

export async function reportCrmIssue(feature: string, message: string): Promise<void> {
  const name = feature.trim().slice(0, 80);
  const text = message.trim().slice(0, 500);
  if (!name || !text) return;
  await recordCrmLog({ feature: name, error: text });
}

export async function loadNavCounts(): Promise<{ success: true; data: NavCounts } | { error: string }> {
  try {
    const [inbox, unread, deals, customers, quotes] = await Promise.allSettled([
      getConversationInbox(),
      getUnreadActivityCount(),
      getDealCount(),
      getCustomerCount(),
      getQuoteCount(),
    ]);
    for (const result of [inbox, unread, deals, customers, quotes]) {
      if (result.status === "rejected") void recordCrmLog({ feature: "navigation", error: result.reason });
    }

    return {
      success: true,
      data: {
        conversationCount: inbox.status === "fulfilled" ? inbox.value.length : 0,
        unreadActivityCount: unread.status === "fulfilled" ? unread.value : 0,
        dealCount: deals.status === "fulfilled" ? deals.value : 0,
        customerCount: customers.status === "fulfilled" ? customers.value : 0,
        quoteCount: quotes.status === "fulfilled" ? quotes.value : 0,
      },
    };
  } catch (error) {
    void recordCrmLog({ feature: "navigation", error });
    const message = error instanceof Error ? error.message : "Could not load navigation";
    return { error: message };
  }
}
