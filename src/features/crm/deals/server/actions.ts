"use server";

import { revalidatePath } from "next/cache";
import { toE164 } from "@/src/common/utils/phone";
import { recordCrmLog } from "@/src/features/crm/common/db/log";
import {
  createCustomer,
  ensureCustomerThread,
  readCustomerByPhone,
  updateCustomer,
} from "@/src/features/crm/common/db/customer";
import { createDealCustomer, deleteDealCustomer } from "@/src/features/crm/common/db/deal-customer";
import { createActivities } from "@/src/features/crm/conversations/db/activity";
import { readConversationSummaryByCustomer } from "@/src/features/crm/conversations/db/conversation";
import { systemEventBody } from "@/src/features/crm/conversations/utils/formatting";
import { assignDefaultDealName, createDeal, deleteDeal } from "@/src/features/crm/deals/db/deal";
import { createDealQuote, deleteDealQuote } from "@/src/features/crm/deals/db/deal-quote";
import { copy } from "@/src/features/crm/deals/locales/en";
import { walkInDealSchema } from "@/src/features/crm/deals/types";
import { DEFAULT_QUOTE_SELECTIONS } from "@/src/features/cpq/utils/catalog";
import { newInvoiceId } from "@/src/features/cpq/utils/id";
import { createQuote, deleteQuote, writeQuoteStatus } from "@/src/features/crm/quotes/db/quote";

export async function createWalkInDeal(input: {
  fullName: string;
  phone: string;
  email: string;
}): Promise<{ success: true; data: { dealId: string; name: string } } | { error: string }> {
  const parsed = walkInDealSchema.safeParse(input);
  const phone = parsed.success ? toE164(parsed.data.phone) : null;
  if (!parsed.success || !phone) return { error: copy.createDealError };

  let quoteId = "";
  let dealId = "";
  let customerId = "";
  let linked = false;

  try {
    quoteId = await createQuote({ invoiceId: newInvoiceId(), selections: DEFAULT_QUOTE_SELECTIONS });
    await writeQuoteStatus(quoteId, "draft");
    const deal = await createDeal({ quoteId, source: "walk_in" });
    dealId = deal.id;
    await createDealQuote({ dealId, quoteId });

    const existing = await readCustomerByPhone(phone);
    const customer =
      existing ??
      (await createCustomer({
        fullName: parsed.data.fullName,
        phone,
        email: parsed.data.email,
      }));
    customerId = customer.id;
    if (existing) await ensureCustomerThread(customer);

    await createDealCustomer({ customerId: customer.id, dealId, isPrimary: true });
    linked = true;
    const name = (await assignDefaultDealName(dealId)) ?? deal.name ?? parsed.data.fullName;
    await updateCustomer(customer.id, { activeDealId: dealId });

    const conversation = await readConversationSummaryByCustomer(customer.id);
    if (!conversation) throw new Error("Conversation was not saved");
    const loggedAt = new Date().toISOString();
    await createActivities(conversation.id, [
      {
        role: "model",
        channel: "system",
        text: systemEventBody("created", name, dealId),
        generatedBy: "manual",
        createdAt: loggedAt,
        readAt: loggedAt,
      },
    ]);

    revalidatePath("/");
    revalidatePath("/conversations");
    revalidatePath("/deals");
    revalidatePath("/customers");
    revalidatePath("/quotes");
    return { success: true, data: { dealId, name: customer.fullName.trim() || parsed.data.fullName } };
  } catch (error) {
    void recordCrmLog({ feature: "deals", error });
    if (linked && customerId && dealId) await deleteDealCustomer(customerId, dealId).catch(() => undefined);
    if (dealId && quoteId) await deleteDealQuote({ dealId, quoteId }).catch(() => undefined);
    if (dealId) await deleteDeal(dealId).catch(() => undefined);
    if (quoteId) await deleteQuote(quoteId).catch(() => undefined);
    return { error: copy.createDealError };
  }
}
