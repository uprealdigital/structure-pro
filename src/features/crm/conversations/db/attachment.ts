import { getSupabase } from "@/src/common/lib/supabase/supabase.service";

const bucket = "conversation-attachments";
const maxAttachmentBytes = 20 * 1024 * 1024;

function attachmentId(value: string): string | undefined {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    return undefined;
  }
  return value;
}

async function ensureBucket(): Promise<void> {
  const { error } = await getSupabase().storage.createBucket(bucket, { public: false });
  if (!error || /already exists/i.test(error.message)) return;
  throw new Error(error.message);
}

export async function storeAttachmentFile(input: {
  id: string;
  name: string;
  type: string;
  bytes: Uint8Array;
}): Promise<void> {
  const id = attachmentId(input.id);
  if (!id) throw new Error("A file is required");
  if (input.bytes.byteLength <= 0 || input.bytes.byteLength > maxAttachmentBytes) {
    throw new Error("That file is too large.");
  }
  await ensureBucket();
  const copy = Buffer.from(input.bytes);
  const { error } = await getSupabase().storage.from(bucket).upload(id, copy, {
    contentType: input.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(error.message);
}

export async function readAttachmentFile(id: string): Promise<{ type: string; bytes: Uint8Array } | undefined> {
  const key = attachmentId(id);
  if (!key) return undefined;
  const { data, error } = await getSupabase().storage.from(bucket).download(key);
  if (error || !data) return undefined;
  return { type: data.type || "application/octet-stream", bytes: new Uint8Array(await data.arrayBuffer()) };
}

export async function deleteAttachmentFile(id: string): Promise<void> {
  const key = attachmentId(id);
  if (!key) return;
  await getSupabase().storage.from(bucket).remove([key]);
}
