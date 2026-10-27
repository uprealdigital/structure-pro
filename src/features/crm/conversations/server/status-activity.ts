import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import { readDealCustomersForDeals } from "@/src/features/crm/common/db/deal-customer";
import { createActivities } from "@/src/features/crm/conversations/db/activity";
import { readConversationSummaryByCustomer } from "@/src/features/crm/conversations/db/conversation";
import { statusEventBody } from "@/src/features/crm/conversations/utils/formatting";
import { readDealQuotesForQuote } from "@/src/features/crm/deals/db/deal-quote";

function crm() {
  return db("crm");
}

async function conversationIdsForDeals(dealIds: string[]): Promise<string[]> {
  const links = await readDealCustomersForDeals(dealIds);
  const ids = new Set<string>();
  for (const link of links) {
    const conversation = await readConversationSummaryByCustomer(link.customerId);
    if (conversation) ids.add(conversation.id);
  }
  return [...ids];
}

async function dealIdsForQuote(quoteId: string): Promise<string[]> {
  const { data, error } = await crm().from("deals").select("id").eq("quote_id", quoteId);
  throwIfError(error);
  const ids = new Set<string>();
  for (const row of data ?? []) {
    if (row && typeof row.id === "string") ids.add(row.id);
  }
  const links = await readDealQuotesForQuote(quoteId);
  for (const link of links) ids.add(link.dealId);
  return [...ids];
}

async function writeStatus(conversationIds: string[], text: string): Promise<void> {
  if (conversationIds.length === 0 || !text) return;
  const sentAt = new Date().toISOString();
  await Promise.all(
    conversationIds.map((conversationId) =>
      createActivities(conversationId, [
        {
          role: "model",
          channel: "system",
          text,
          generatedBy: "manual",
          createdAt: sentAt,
          readAt: sentAt,
        },
      ]),
    ),
  );
}

export async function recordDealStatusActivity(input: {
  dealId: string;
  name: string;
  status: string;
}): Promise<void> {
  const name = input.name.trim();
  const status = input.status.trim();
  if (!input.dealId || !name || !status) return;
  try {
    const conversations = await conversationIdsForDeals([input.dealId]);
    await writeStatus(conversations, statusEventBody("dealStatus", name, status));
  } catch {
    // The status is already saved. A missing conversation should not undo it.
  }
}

export async function recordQuoteStatusActivity(input: {
  quoteId: string;
  name: string;
  status: string;
}): Promise<void> {
  const name = input.name.trim();
  const status = input.status.trim();
  if (!input.quoteId || !name || !status) return;
  try {
    const deals = await dealIdsForQuote(input.quoteId);
    const conversations = await conversationIdsForDeals(deals);
    await writeStatus(conversations, statusEventBody("quoteStatus", name, status));
  } catch {
    // The status is already saved. A missing conversation should not undo it.
  }
}
