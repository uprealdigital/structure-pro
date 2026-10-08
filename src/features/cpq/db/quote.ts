import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import { quoteSelectionsSchema, type QuoteRecord } from "@/src/features/cpq/types";

function cpq() {
  return db("cpq");
}

export async function createQuote(input: {
  invoiceId: string;
  selections: unknown;
}): Promise<string> {
  const selections = quoteSelectionsSchema.parse(input.selections);
  const { data, error } = await cpq()
    .from("quotes")
    .insert({
      invoice_id: input.invoiceId,
      selections,
    })
    .select("id")
    .single();

  throwIfError(error);
  if (!data?.id || typeof data.id !== "string") {
    throw new Error("Quote was not saved");
  }
  return data.id;
}

export async function readQuote(id: string): Promise<QuoteRecord | undefined> {
  const { data, error } = await cpq()
    .from("quotes")
    .select("id, invoice_id, selections")
    .eq("id", id)
    .maybeSingle();

  throwIfError(error);
  if (!data || typeof data.id !== "string" || typeof data.invoice_id !== "string") {
    return undefined;
  }
  const selections = quoteSelectionsSchema.safeParse(data.selections);
  if (!selections.success) return undefined;

  return {
    id: data.id,
    invoiceId: data.invoice_id,
    selections: selections.data,
  };
}

export async function updateQuote(
  id: string,
  patch: { invoiceId?: string; selections?: unknown },
): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.invoiceId) row.invoice_id = patch.invoiceId;
  if (patch.selections) row.selections = quoteSelectionsSchema.parse(patch.selections);
  const { error } = await cpq().from("quotes").update(row).eq("id", id);
  throwIfError(error);
}

export async function deleteQuote(id: string): Promise<void> {
  const { error } = await cpq().from("quotes").delete().eq("id", id);
  throwIfError(error);
}
