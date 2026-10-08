import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import {
  configurationIdSchema,
  storedConfigurationSchema,
  type SavedConfiguration,
} from "@/src/features/cpq/types";
import { newConfigurationId } from "@/src/features/cpq/utils/id";

function cpq() {
  return db("cpq");
}

export async function createConfiguration(selections: unknown): Promise<string> {
  const stored = storedConfigurationSchema.parse(selections);
  const id = newConfigurationId();
  const { error } = await cpq().from("configurations").insert({
    id,
    selections: stored,
  });
  throwIfError(error);
  return id;
}

export async function readConfiguration(id: string): Promise<SavedConfiguration | undefined> {
  if (!configurationIdSchema.safeParse(id).success) return undefined;

  const { data, error } = await cpq()
    .from("configurations")
    .select("id, selections")
    .eq("id", id)
    .maybeSingle();

  throwIfError(error);
  if (!data || typeof data.id !== "string") return undefined;
  const selections = storedConfigurationSchema.safeParse(data.selections);
  if (!selections.success) return undefined;

  return {
    id: data.id,
    selections: selections.data,
  };
}

export async function updateConfiguration(id: string, selections: unknown): Promise<void> {
  const stored = storedConfigurationSchema.parse(selections);
  const { error } = await cpq().from("configurations").update({ selections: stored }).eq("id", id);
  throwIfError(error);
}

export async function deleteConfiguration(id: string): Promise<void> {
  const { error } = await cpq().from("configurations").delete().eq("id", id);
  throwIfError(error);
}
