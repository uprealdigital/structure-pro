import { describeSelections } from "@/src/lib/selections";
import { getSupabase } from "@/src/lib/supabase";
import type { QuoteContact, QuoteSelections } from "@/src/lib/quote-types";

const BUCKET = "yard-previews";

export type YardPreviewEvent = {
  at: string;
  step: string;
  detail?: string;
};

export type YardPreviewStatus = "accepted" | "emailed" | "failed";

type YardPreviewPatch = {
  status?: YardPreviewStatus;
  error?: string | null;
  events?: YardPreviewEvent[];
  yardPhotoPath?: string;
  shedRenderPath?: string;
  previewPath?: string;
};

function throwIfError(
  error: { message: string; code?: string; details?: string; hint?: string } | null,
): void {
  if (!error) return;
  const extra = [error.code, error.details, error.hint].filter(Boolean).join(" — ");
  throw new Error(extra ? `${error.message} (${extra})` : error.message);
}

function extensionFor(mimeType: string): string {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("heic")) return "heic";
  return "jpg";
}

export function previewSummary(selections: QuoteSelections): string {
  const described = describeSelections(selections);
  const lines = described.specs.map((spec) => `${spec.label}: ${spec.value}`);
  lines.push(`Estimated price: ${described.estimate.total} USD`);
  return lines.join("\n");
}

export function previewEvent(step: string, detail?: string): YardPreviewEvent {
  return {
    at: new Date().toISOString(),
    step,
    ...(detail ? { detail } : {}),
  };
}

export function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function createYardPreview(input: {
  contact: QuoteContact;
  selections: QuoteSelections;
  events: YardPreviewEvent[];
}): Promise<string> {
  const { data, error } = await getSupabase()
    .from("yard_previews")
    .insert({
      full_name: input.contact.fullName,
      phone: input.contact.phone,
      email: input.contact.email,
      selections: input.selections,
      summary: previewSummary(input.selections),
      status: "accepted",
      events: input.events,
    })
    .select("id")
    .single();

  throwIfError(error);
  if (!data?.id) throw new Error("Yard preview was not saved");
  return data.id;
}

export async function updateYardPreview(
  id: string,
  patch: YardPreviewPatch,
): Promise<void> {
  const row: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.status) row.status = patch.status;
  if (patch.error !== undefined) row.error = patch.error;
  if (patch.events) row.events = patch.events;
  if (patch.yardPhotoPath) row.yard_photo_path = patch.yardPhotoPath;
  if (patch.shedRenderPath) row.shed_render_path = patch.shedRenderPath;
  if (patch.previewPath) row.preview_path = patch.previewPath;

  const { error } = await getSupabase().from("yard_previews").update(row).eq("id", id);
  throwIfError(error);
}

async function ensureBucket(): Promise<void> {
  const { error } = await getSupabase().storage.createBucket(BUCKET, { public: false });
  if (!error || /already exists/i.test(error.message)) return;
  throw new Error(error.message);
}

export async function storeYardPreviewImage(input: {
  id: string;
  name: "yard" | "shed" | "preview";
  bytes: Buffer;
  mimeType: string;
}): Promise<string> {
  await ensureBucket();
  const path = `${input.id}/${input.name}.${extensionFor(input.mimeType)}`;
  const { error } = await getSupabase()
    .storage.from(BUCKET)
    .upload(path, input.bytes, {
      contentType: input.mimeType,
      upsert: true,
    });
  throwIfError(error);
  return path;
}
