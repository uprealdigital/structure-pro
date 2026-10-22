import { readAttachmentFile } from "@/src/features/crm/conversations/db/attachment";
import { storeManualAttachment } from "@/src/features/crm/conversations/server/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const file = await readAttachmentFile(id);
  if (!file) return new Response("Not found", { status: 404 });
  const copy = new ArrayBuffer(file.bytes.byteLength);
  new Uint8Array(copy).set(file.bytes);
  return new Response(copy, {
    headers: { "Content-Type": file.type || "application/octet-stream", "Cache-Control": "private, max-age=3600" },
  });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const id = form.get("id");
  const result = await storeManualAttachment({
    id: typeof id === "string" ? id : "",
    file: file instanceof File ? file : new File([], ""),
  });
  return Response.json(result, { status: "error" in result ? 400 : 200 });
}
