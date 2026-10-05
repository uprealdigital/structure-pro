import { randomBytes } from "node:crypto";
import { isConfigurationId } from "@/src/lib/configuration-link";
import { isStoredConfiguration } from "@/src/lib/selections";
import { getSupabase } from "@/src/lib/supabase";
import type { StoredConfiguration } from "@/src/lib/quote-types";

export type SavedConfiguration = {
  id: string;
  selections: StoredConfiguration;
};

function throwIfError(
  error: { message: string; code?: string; details?: string; hint?: string } | null,
): void {
  if (!error) return;
  const extra = [error.code, error.details, error.hint].filter(Boolean).join(" — ");
  throw new Error(extra ? `${error.message} (${extra})` : error.message);
}

export async function saveConfiguration(selections: StoredConfiguration): Promise<string> {
  const id = randomBytes(16).toString("hex");
  const { error } = await getSupabase().from("configurations").insert({
    id,
    selections,
  });
  throwIfError(error);
  return id;
}

export async function getConfiguration(
  id: string,
): Promise<SavedConfiguration | undefined> {
  if (!isConfigurationId(id)) return undefined;

  const { data, error } = await getSupabase()
    .from("configurations")
    .select("id, selections")
    .eq("id", id)
    .maybeSingle();

  throwIfError(error);
  if (!data || typeof data.id !== "string") return undefined;
  if (!isStoredConfiguration(data.selections)) return undefined;

  return {
    id: data.id,
    selections: data.selections,
  };
}
