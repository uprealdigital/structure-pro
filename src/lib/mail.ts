import nodemailer from "nodemailer";
import { buildInvoiceHtml } from "@/src/lib/invoice-html";
import type { QuoteSession } from "@/src/lib/quote-types";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

export async function sendInvoiceEmail(session: QuoteSession): Promise<void> {
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

  const html = buildInvoiceHtml({
    contact: {
      fullName: session.fullName,
      phone: session.phone,
      email: session.email,
    },
    selections: session.selections,
    invoiceId: session.invoiceId,
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM?.trim() || user,
    to: session.email,
    subject: `Invoice ${session.invoiceId} — ${session.fullName}`,
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
}
