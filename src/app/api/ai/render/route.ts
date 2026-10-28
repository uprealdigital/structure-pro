import { beautifyRender } from "@/src/features/ai/services/render.service";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 8_000_000;

function imageFile(value: FormDataEntryValue | null): File | null {
  if (!(value instanceof File) || value.size === 0 || value.size > MAX_BYTES) return null;
  const type = value.type.toLowerCase();
  if (type === "image/png" || type === "image/jpeg" || type === "image/webp") return value;
  return null;
}

function responseMime(value: string): string {
  const mime = value.toLowerCase().split(";")[0]?.trim() ?? "";
  if (mime.startsWith("image/")) return mime;
  return "image/png";
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const render = imageFile(form.get("render"));
  if (!render) {
    return Response.json({ error: "A render image is required" }, { status: 400 });
  }

  try {
    const image = await beautifyRender({
      render: {
        bytes: Buffer.from(await render.arrayBuffer()),
        mimeType: render.type,
      },
    });
    return new Response(new Uint8Array(image.bytes), {
      headers: {
        "Content-Type": responseMime(image.mimeType),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "The render could not be beautified" }, { status: 500 });
  }
}
