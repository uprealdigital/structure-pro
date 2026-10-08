import { db, getSupabase } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import type {
  YardPreview,
  YardPreviewEvent,
  YardPreviewStatus,
} from "@/src/features/ai/types";

const BUCKET = "yard-previews";

type YardPreviewPatch = {
  status?: YardPreviewStatus;
  error?: string | null;
  events?: YardPreviewEvent[];
  yardPhotoPath?: string;
  buildingRenderPath?: string;
  previewPath?: string;
};

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
  crmContactId: string;
  crmDealId: string;
  events: YardPreviewEvent[];
}): Promise<string> {
  const { data, error } = await ai()
    .from("yard_previews")
    .insert({
      crm_contact_id: input.crmContactId,
      crm_deal_id: input.crmDealId,
      status: "accepted",
      events: input.events,
    })
    .select("id")
    .single();

  throwIfError(error);
  if (!data?.id || typeof data.id !== "string") throw new Error("Yard preview was not saved");
  return data.id;
}

export async function updateYardPreview(id: string, patch: YardPreviewPatch): Promise<void> {
  const row: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.status) row.status = patch.status;
  if (patch.error !== undefined) row.error = patch.error;
  if (patch.events) row.events = patch.events;
  if (patch.yardPhotoPath) row.yard_photo_path = patch.yardPhotoPath;
  if (patch.buildingRenderPath) row.building_render_path = patch.buildingRenderPath;
  if (patch.previewPath) row.preview_path = patch.previewPath;

  const { error } = await ai().from("yard_previews").update(row).eq("id", id);
  throwIfError(error);
}

export async function readYardPreview(id: string): Promise<YardPreview | undefined> {
  const { data, error } = await ai()
    .from("yard_previews")
    .select("id, crm_contact_id, crm_deal_id, status, error")
    .eq("id", id)
    .maybeSingle();

  throwIfError(error);
  if (!data || typeof data.id !== "string") return undefined;
  if (data.status !== "accepted" && data.status !== "emailed" && data.status !== "failed") {
    return undefined;
  }

  return {
    id: data.id,
    crmContactId: data.crm_contact_id,
    crmDealId: data.crm_deal_id,
    status: data.status,
    error: typeof data.error === "string" ? data.error : null,
  };
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
