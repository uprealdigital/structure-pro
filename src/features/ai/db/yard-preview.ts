import { db, getSupabase } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import {
  yardPreviewPatchSchema,
  yardPreviewWriteSchema,
  type YardPreview,
  type YardPreviewEvent,
} from "@/src/features/ai/types";
import { toYardPreview, type YardPreviewRow } from "@/src/features/ai/utils/mappers";

const BUCKET = "yard-previews";

function ai() {
  return db("ai");
}

function extensionFor(mimeType: string): string {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("heic")) return "heic";
  return "jpg";
}

export async function createYardPreview(input: {
  crmCustomerId: string;
  crmDealId: string;
  events: YardPreviewEvent[];
}): Promise<string> {
  const preview = yardPreviewWriteSchema.parse(input);
  const { data, error } = await ai()
    .from("yard_previews")
    .insert({
      crm_customer_id: preview.crmCustomerId,
      crm_deal_id: preview.crmDealId,
      status: "accepted",
      events: preview.events,
    })
    .select("id")
    .single();

  throwIfError(error);
  if (!data?.id || typeof data.id !== "string") throw new Error("Yard preview was not saved");
  return data.id;
}

export async function readYardPreview(id: string): Promise<YardPreview | undefined> {
  const { data, error } = await ai()
    .from("yard_previews")
    .select("id, crm_customer_id, crm_deal_id, status, error")
    .eq("id", id)
    .maybeSingle();

  throwIfError(error);
  if (!data) return undefined;
  return toYardPreview(data as YardPreviewRow);
}

export async function updateYardPreview(
  id: string,
  patch: {
    status?: unknown;
    error?: string | null;
    events?: YardPreviewEvent[];
    yardPhotoPath?: string;
    buildingRenderPath?: string;
    previewPath?: string;
  },
): Promise<void> {
  const next = yardPreviewPatchSchema.parse(patch);
  const row: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (next.status) row.status = next.status;
  if (next.error !== undefined) row.error = next.error;
  if (next.events) row.events = next.events;
  if (next.yardPhotoPath) row.yard_photo_path = next.yardPhotoPath;
  if (next.buildingRenderPath) row.building_render_path = next.buildingRenderPath;
  if (next.previewPath) row.preview_path = next.previewPath;

  const { error } = await ai().from("yard_previews").update(row).eq("id", id);
  throwIfError(error);
}

export async function deleteYardPreview(id: string): Promise<void> {
  const { error } = await ai().from("yard_previews").delete().eq("id", id);
  throwIfError(error);
}

async function ensureBucket(): Promise<void> {
  const { error } = await getSupabase().storage.createBucket(BUCKET, { public: false });
  if (!error || /already exists/i.test(error.message)) return;
  throw new Error(error.message);
}

export async function storeYardPreviewImage(input: {
  id: string;
  name: "yard" | "building" | "preview";
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
