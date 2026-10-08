import { assertInternal } from "@/src/common/utils/internal-call";
import type { RouteContext } from "@/src/common/types";
import { getQuoteForPage } from "@/src/features/cpq/server/queries";
import { quoteContactSchema } from "@/src/features/cpq/types";
import { buildInvoiceHtml } from "@/src/features/cpq/utils/invoice";
import {
  buildYardPreviewHtml,
  buildYardPreviewText,
  YARD_PREVIEW_CID,
} from "@/src/features/cpq/utils/yard-preview";

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext) {
  const denied = assertInternal(request);
  if (denied) return denied;
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }
  const payload = body as { kind?: unknown; contact?: unknown };
  const contact = quoteContactSchema.safeParse(payload.contact);
  if (!contact.success) {
    return Response.json({ error: "contact is required" }, { status: 400 });
  }

  try {
    const quote = await getQuoteForPage(id);
    if (!quote) return Response.json({ error: "Quote not found" }, { status: 404 });

    if (payload.kind === "invoice") {
      const html = buildInvoiceHtml({
        contact: contact.data,
        selections: quote.selections,
        invoiceId: quote.invoiceId,
      });
      return Response.json({
        subject: `Invoice ${quote.invoiceId} — ${contact.data.fullName}`,
        text: `Invoice ${quote.invoiceId} for ${contact.data.fullName} is attached in this email.`,
        html,
        attachment: {
          filename: "quote.json",
          contentType: "application/json",
          content: JSON.stringify(
            {
              fullName: contact.data.fullName,
              phone: contact.data.phone,
              email: contact.data.email,
              selections: quote.selections,
              invoiceId: quote.invoiceId,
            },
            null,
            2,
          ),
        },
      });
    }

    if (payload.kind === "yard-preview") {
      return Response.json({
        subject: `Your backyard preview — ${contact.data.fullName}`,
        text: buildYardPreviewText({ contact: contact.data, selections: quote.selections }),
        html: buildYardPreviewHtml({ contact: contact.data, selections: quote.selections }),
        cid: YARD_PREVIEW_CID,
      });
    }

    return Response.json({ error: "kind is required" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not render document";
    return Response.json({ error: message }, { status: 500 });
  }
}
