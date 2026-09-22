import { after } from "next/server";
import { compositeYardPreview } from "@/src/lib/gemini-yard";
import { sendYardPreviewEmail } from "@/src/lib/mail";
import { toE164 } from "@/src/lib/phone";
import type { QuoteSelections } from "@/src/lib/quote-types";
import { isQuoteSelections } from "@/src/lib/selections";
import {
  createYardPreview,
  errorDetail,
  previewEvent,
  storeYardPreviewImage,
  updateYardPreview,
  type YardPreviewEvent,
} from "@/src/lib/yard-previews";

export const runtime = "nodejs";
export const maxDuration = 60;

function textField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function imageFile(value: FormDataEntryValue | null): File | null {
  if (!(value instanceof File) || value.size === 0) return null;
  const type = value.type.toLowerCase();
  const name = value.name.toLowerCase();
  const looksLikeImage =
    type.startsWith("image/") ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp") ||
    name.endsWith(".heic");
  return looksLikeImage ? value : null;
}

function mimeTypeFor(file: File): string {
  if (file.type.startsWith("image/")) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".heic")) return "image/heic";
  return "image/jpeg";
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const fullName = textField(form, "fullName").trim();
  const email = textField(form, "email").trim();
  const phone = toE164(textField(form, "phone"));
  let selections: unknown;
  try {
    selections = JSON.parse(textField(form, "selections"));
  } catch {
    selections = null;
  }

  const yardPhoto = imageFile(form.get("yardPhoto"));
  const shedRender = imageFile(form.get("shedRender"));

  if (!fullName || !email || !phone || !isQuoteSelections(selections)) {
    return Response.json(
      { error: "fullName, phone, email, and selections are required" },
      { status: 400 },
    );
  }

  if (!yardPhoto || !shedRender) {
    return Response.json(
      { error: "A yard photo and shed render are required" },
      { status: 400 },
    );
  }

  let yardBytes: Buffer;
  let shedBytes: Buffer;
  try {
    yardBytes = Buffer.from(await yardPhoto.arrayBuffer());
    shedBytes = Buffer.from(await shedRender.arrayBuffer());
  } catch {
    return Response.json(
      { error: "A yard photo and shed render are required" },
      { status: 400 },
    );
  }

  if (yardBytes.length === 0 || shedBytes.length === 0) {
    return Response.json(
      { error: "A yard photo and shed render are required" },
      { status: 400 },
    );
  }

  const quoteSelections: QuoteSelections = selections;
  const contact = { fullName, phone, email };
  const yardMime = mimeTypeFor(yardPhoto);
  const shedMime = mimeTypeFor(shedRender);
  const events: YardPreviewEvent[] = [
    previewEvent("accepted", "Request accepted. Image generation has not started."),
  ];

  let previewId: string | undefined;
  try {
    previewId = await createYardPreview({
      contact,
      selections: quoteSelections,
      events,
    });
  } catch (error) {
    console.error(error);
  }

  after(async () => {
    try {
      if (previewId) {
        const yardPhotoPath = await storeYardPreviewImage({
          id: previewId,
          name: "yard",
          bytes: yardBytes,
          mimeType: yardMime,
        });
        const shedRenderPath = await storeYardPreviewImage({
          id: previewId,
          name: "shed",
          bytes: shedBytes,
          mimeType: shedMime,
        });
        events.push(previewEvent("images-stored", "Yard photo and shed render saved."));
        await updateYardPreview(previewId, {
          events,
          yardPhotoPath,
          shedRenderPath,
        });
      }

      const preview = await compositeYardPreview({
        yardPhoto: { bytes: yardBytes, mimeType: yardMime },
        shedRender: { bytes: shedBytes, mimeType: shedMime },
        selections: quoteSelections,
      });

      if (previewId) {
        const previewPath = await storeYardPreviewImage({
          id: previewId,
          name: "preview",
          bytes: preview.bytes,
          mimeType: preview.mimeType,
        });
        events.push(previewEvent("image-generated", "Gemini returned the composite."));
        await updateYardPreview(previewId, { events, previewPath });
      }

      const messageId = await sendYardPreviewEmail({
        contact,
        selections: quoteSelections,
        image: preview.bytes,
        mimeType: preview.mimeType,
      });

      if (previewId) {
        events.push(
          previewEvent("emailed", messageId ? `Mail accepted (${messageId})` : "Mail accepted."),
        );
        await updateYardPreview(previewId, { status: "emailed", events, error: null });
      }
    } catch (error) {
      console.error(error);
      if (!previewId) return;
      events.push(previewEvent("failed", errorDetail(error)));
      await updateYardPreview(previewId, {
        status: "failed",
        error: errorDetail(error),
        events,
      }).catch((saveError) => {
        console.error(saveError);
      });
    }
  });

  return Response.json({ ok: true });
}
