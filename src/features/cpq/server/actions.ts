"use server";

import { revalidatePath } from "next/cache";
import { callRouter, readJson } from "@/src/common/utils/internal-call";
import { toE164 } from "@/src/common/utils/phone";
import { openingSms } from "@/src/features/cpq/utils/system";
import { createConfiguration } from "@/src/features/cpq/db/configuration";
import { createQuote, deleteQuote } from "@/src/features/crm/quotes/db/quote";
import { getConfiguration } from "@/src/features/cpq/server/queries";
import {
  localeCodeSchema,
  quoteContactSchema,
  quoteSelectionsSchema,
  type StoredConfiguration,
} from "@/src/features/cpq/types";
import { newInvoiceId } from "@/src/features/cpq/utils/id";
import { toStoredConfiguration } from "@/src/features/cpq/utils/mappers";

export type ActionResult<T> = { success: true; data: T } | { error: string };

function quoteChannel(): "twilio" | "telegram" {
  return process.env.QUOTE_CHANNEL?.trim().toLowerCase() === "telegram" ? "telegram" : "twilio";
}

export async function getConfigurationAction(
  id: string,
): Promise<StoredConfiguration | null> {
  const saved = await getConfiguration(id);
  return saved?.selections ?? null;
}

export async function saveConfigAction(input: {
  selections: unknown;
  lng?: unknown;
}): Promise<ActionResult<{ id: string }>> {
  const selections = input.selections;
  const lng =
    selections && typeof selections === "object" && "lng" in selections
      ? selections.lng
      : input.lng;
  const quote = quoteSelectionsSchema.safeParse(selections);
  const locale = localeCodeSchema.safeParse(lng);
  if (!quote.success || !locale.success) {
    return { error: "A configuration and language are required" };
  }

  try {
    const id = await createConfiguration(toStoredConfiguration(quote.data, locale.data));
    revalidatePath("/");
    return { success: true, data: { id } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save configuration";
    return { error: message };
  }
}

export async function createQuoteAction(input: {
  fullName: string;
  phone: string;
  email: string;
  selections: unknown;
}): Promise<ActionResult<{ invoiceId: string; channel: "twilio" | "telegram" }>> {
  const contact = quoteContactSchema.safeParse({
    fullName: input.fullName,
    phone: input.phone,
    email: input.email,
  });
  const phone = contact.success ? toE164(contact.data.phone) : null;
  const selections = quoteSelectionsSchema.safeParse(input.selections);
  if (!contact.success || !phone || !selections.success) {
    return { error: "fullName, phone, email, and selections are required" };
  }

  const channel = quoteChannel();
  const invoiceId = newInvoiceId();
  const openingMessage = openingSms(contact.data.fullName, selections.data);
  let quoteId: string | undefined;
  let dealId: string | undefined;
  let lookupKey: string | undefined;

  try {
    quoteId = await createQuote({ invoiceId, selections: selections.data });

    const { POST: createDealRoute } = await import("@/src/app/api/crm/deals/route");
    const deal = await readJson<{ id: string }>(
      await callRouter(createDealRoute, "/api/crm/deals", {
        body: { quoteId, source: "quote" },
      }),
    );
    dealId = deal.id;

    const { POST: createCustomer } = await import("@/src/app/api/crm/customers/route");
    const savedCustomer = await readJson<{ id: string }>(
      await callRouter(createCustomer, "/api/crm/customers", {
        body: {
          dealId: deal.id,
          fullName: contact.data.fullName,
          phone,
          email: contact.data.email,
        },
      }),
    );

    const { POST: start } = await import("@/src/app/api/ai/conversations/route");
    const started = await readJson<{ lookupKey: string }>(
      await callRouter(start, "/api/ai/conversations", {
        body: {
          phone,
          channel,
          customerId: savedCustomer.id,
          openingMessage,
        },
      }),
    );
    lookupKey = started.lookupKey;

    revalidatePath("/");
    return { success: true, data: { invoiceId, channel } };
  } catch (error) {
    if (lookupKey) {
      const { DELETE: removeConversation } = await import("@/src/app/api/ai/conversations/route");
      await callRouter(removeConversation, "/api/ai/conversations", {
        method: "DELETE",
        body: { lookupKey },
      }).catch(() => undefined);
    }
    if (dealId) {
      const { DELETE: removeDeal } = await import("@/src/app/api/crm/deals/[id]/route");
      await callRouter(removeDeal, `/api/crm/deals/${dealId}`, {
        method: "DELETE",
        params: { id: dealId },
      }).catch(() => undefined);
    }
    if (quoteId) await deleteQuote(quoteId).catch(() => undefined);

    const message = error instanceof Error ? error.message : `Could not send ${channel} message`;
    const startedHint =
      channel === "telegram" && /bot was blocked|chat not found|Forbidden/i.test(message)
        ? " Open the Telegram bot and tap Start, then submit again."
        : "";
    return { error: `${message}.${startedHint}` };
  }
}
