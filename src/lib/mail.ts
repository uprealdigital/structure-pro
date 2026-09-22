import nodemailer, { type SentMessageInfo } from "nodemailer";
import { buildInvoiceHtml } from "@/src/lib/invoice-html";
import type { QuoteContact, QuoteSelections, QuoteSession } from "@/src/lib/quote-types";
import {
  buildYardPreviewHtml,
  buildYardPreviewText,
  YARD_PREVIEW_CID,
} from "@/src/lib/yard-preview-html";

function addressText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "address" in value) {
    const address = (value as { address?: unknown }).address;
    return typeof address === "string" ? address : "";
  }
  return "";
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim().replace(/^["']|["']$/g, "");
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function createGmailMailer() {
  const user = requireEnv("SMTP_USER");
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user,
      pass: requireEnv("SMTP_PASS"),
    },
  });
  const from = process.env.SMTP_FROM?.trim().replace(/^["']|["']$/g, "") || user;
  return { transporter, user, from };
}

function assertAccepted(info: SentMessageInfo, email: string) {
  const accepted = (info.accepted ?? []).map(addressText);
  const rejected = (info.rejected ?? []).map(addressText);
  const delivered = accepted.some((item) =>
    item.toLowerCase().includes(email.toLowerCase()),
  );
  if (!delivered || rejected.length > 0) {
    throw new Error(
      `Mail server did not accept ${email}. ${info.response ?? ""}`.trim(),
    );
  }
  return info.messageId;
}

export async function sendInvoiceEmail(session: QuoteSession): Promise<void> {
  const { transporter, user, from } = createGmailMailer();
  const html = buildInvoiceHtml({
    contact: {
      fullName: session.fullName,
      phone: session.phone,
      email: session.email,
    },
    selections: session.selections,
    invoiceId: session.invoiceId,
  });

  const info = await transporter.sendMail({
    from,
    to: session.email,
    envelope: { from: user, to: session.email },
    subject: `Invoice ${session.invoiceId} — ${session.fullName}`,
    text: `Invoice ${session.invoiceId} for ${session.fullName} is attached in this email.`,
    html,
    attachments: [
      {
        filename: "quote.json",
        content: JSON.stringify(
          {
            fullName: session.fullName,
            phone: session.phone,
            email: session.email,
            selections: session.selections,
            invoiceId: session.invoiceId,
          },
          null,
          2,
        ),
        contentType: "application/json",
      },
    ],
  });

  const messageId = assertAccepted(info, session.email);
  console.log(
    `Invoice ${session.invoiceId} accepted for ${session.email} (${messageId})`,
  );
}

function previewFilename(mimeType: string): string {
  if (mimeType.includes("png")) return "backyard-preview.png";
  if (mimeType.includes("webp")) return "backyard-preview.webp";
  return "backyard-preview.jpg";
}

export async function sendYardPreviewEmail(input: {
  contact: QuoteContact;
  selections: QuoteSelections;
  image: Buffer;
  mimeType: string;
}): Promise<string> {
  const { transporter, user, from } = createGmailMailer();
  const mimeType = input.mimeType || "image/jpeg";
  const html = buildYardPreviewHtml(input);
  const text = buildYardPreviewText(input);
  const info = await transporter.sendMail({
    from,
    to: input.contact.email,
    envelope: { from: user, to: input.contact.email },
    subject: `Your backyard preview — ${input.contact.fullName}`,
    text,
    html,
    attachments: [
      {
        filename: previewFilename(mimeType),
        content: input.image,
        cid: YARD_PREVIEW_CID,
        contentType: mimeType,
        contentDisposition: "inline",
      },
    ],
  });

  const messageId = assertAccepted(info, input.contact.email);
  console.log(
    `Backyard preview accepted for ${input.contact.email} (${messageId})`,
  );
  return messageId ?? "";
}
