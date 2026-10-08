import { after } from "next/server";
import { callRouter, readJson } from "@/src/common/utils/internal-call";
import { sendMail } from "@/src/common/utils/mail";
import { toE164 } from "@/src/common/utils/phone";
import {
  createYardPreview,
  storeYardPreviewImage,
  updateYardPreview,
} from "@/src/features/ai/db/yard-preview";
import type { YardPreviewEvent } from "@/src/features/ai/types";
import {
  compositeYardPreview,
  errorDetail,
  previewEvent,
  yardSpecLines,
} from "@/src/features/ai/utils/yard-preview";

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

type QuotePayload = {
  id: string;
  summary: { specs: { label: string; value: string }[] };
};

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
  const buildingRender = imageFile(form.get("buildingRender"));

  if (!fullName || !email || !phone || !selections || typeof selections !== "object") {
    return Response.json(
      { error: "fullName, phone, email, and selections are required" },
      { status: 400 },
    );
  }

  if (!yardPhoto || !buildingRender) {
    return Response.json(
      { error: "A yard photo and building render are required" },
      { status: 400 },
    );
  }

  let yardBytes: Buffer;
  let buildingBytes: Buffer;
  try {
    yardBytes = Buffer.from(await yardPhoto.arrayBuffer());
    buildingBytes = Buffer.from(await buildingRender.arrayBuffer());
  } catch {
    return Response.json(
      { error: "A yard photo and building render are required" },
      { status: 400 },
    );
  }

  if (yardBytes.length === 0 || buildingBytes.length === 0) {
    return Response.json(
      { error: "A yard photo and building render are required" },
      { status: 400 },
    );
  }

  const contact = { fullName, phone, email };
  const yardMime = mimeTypeFor(yardPhoto);
  const buildingMime = mimeTypeFor(buildingRender);

  const { POST: create } = await import("@/src/app/api/cpq/quotes/route");
  const quoteResponse = await callRouter(create, "/api/cpq/quotes", {
    body: { selections },
  });
  if (!quoteResponse.ok) return quoteResponse;
  const quote = await readJson<QuotePayload>(quoteResponse);

  let dealId: string | undefined;
  try {
    const { POST: upsertContact } = await import("@/src/app/api/crm/contacts/route");
    const savedContact = await readJson<{ id: string }>(
      await callRouter(upsertContact, "/api/crm/contacts", {
        body: contact,
      }),
    );
    const { POST: createDeal } = await import("@/src/app/api/crm/deals/route");
    const deal = await readJson<{ id: string }>(
      await callRouter(createDeal, "/api/crm/deals", {
        body: {
          contactId: savedContact.id,
          cpqQuoteId: quote.id,
          source: "yard_preview",
        },
      }),
    );
    dealId = deal.id;

    const events: YardPreviewEvent[] = [
      previewEvent("accepted", "Request accepted. Image generation has not started."),
    ];
    const previewId = await createYardPreview({
      crmContactId: savedContact.id,
      crmDealId: deal.id,
      events,
    });
    const specLines = yardSpecLines(quote.summary.specs);

    after(async () => {
      try {
        const yardPhotoPath = await storeYardPreviewImage({
          id: previewId,
          name: "yard",
          bytes: yardBytes,
          mimeType: yardMime,
        });
        const buildingRenderPath = await storeYardPreviewImage({
          id: previewId,
          name: "building",
          bytes: buildingBytes,
          mimeType: buildingMime,
        });
        events.push(previewEvent("images-stored", "Yard photo and building render saved."));
        await updateYardPreview(previewId, {
          events,
          yardPhotoPath,
          buildingRenderPath,
        });

        const preview = await compositeYardPreview({
          yardPhoto: { bytes: yardBytes, mimeType: yardMime },
          buildingRender: { bytes: buildingBytes, mimeType: buildingMime },
          specLines,
        });

        const previewPath = await storeYardPreviewImage({
          id: previewId,
          name: "preview",
          bytes: preview.bytes,
          mimeType: preview.mimeType,
        });
        events.push(previewEvent("image-generated", "Gemini returned the composite."));
        await updateYardPreview(previewId, { events, previewPath });

        const { POST: renderDocument } = await import(
          "@/src/app/api/cpq/quotes/[id]/document/route"
        );
        const document = await readJson<{
          subject: string;
          text: string;
          html: string;
          cid: string;
        }>(
          await callRouter(renderDocument, `/api/cpq/quotes/${quote.id}/document`, {
            method: "POST",
            params: { id: quote.id },
            body: { kind: "yard-preview", contact },
          }),
        );
        const messageId = await sendMail({
          to: contact.email,
          subject: document.subject,
          text: document.text,
          html: document.html,
          attachments: [
            {
              filename: preview.mimeType.includes("png")
                ? "backyard-preview.png"
                : preview.mimeType.includes("webp")
                  ? "backyard-preview.webp"
                  : "backyard-preview.jpg",
              content: preview.bytes,
              cid: document.cid,
              contentType: preview.mimeType,
              contentDisposition: "inline",
            },
          ],
        });
        console.log(`Backyard preview accepted for ${contact.email} (${messageId})`);

        events.push(
          previewEvent("emailed", messageId ? `Mail accepted (${messageId})` : "Mail accepted."),
        );
        await updateYardPreview(previewId, { status: "emailed", events, error: null });
      } catch (error) {
        console.error(error);
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
  } catch (error) {
    const { DELETE: remove } = await import("@/src/app/api/cpq/quotes/[id]/route");
    await callRouter(remove, `/api/cpq/quotes/${quote.id}`, {
      method: "DELETE",
      params: { id: quote.id },
    }).catch(() => undefined);
    if (dealId) {
      const { DELETE: removeDeal } = await import("@/src/app/api/crm/deals/[id]/route");
      await callRouter(removeDeal, `/api/crm/deals/${dealId}`, {
        method: "DELETE",
        params: { id: dealId },
      }).catch(() => undefined);
    }
    const message = error instanceof Error ? error.message : "Could not save backyard preview";
    return Response.json({ error: message }, { status: 500 });
  }
}
