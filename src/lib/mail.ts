import nodemailer from "nodemailer";
import { buildInvoiceHtml } from "@/src/lib/invoice-html";
import type { QuoteSession } from "@/src/lib/quote-types";

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

  const from = process.env.SMTP_FROM?.trim().replace(/^["']|["']$/g, "") || user;
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

  const accepted = (info.accepted ?? []).map(addressText);
  const rejected = (info.rejected ?? []).map(addressText);
  const delivered = accepted.some((item) =>
    item.toLowerCase().includes(session.email.toLowerCase()),
  );
  if (!delivered || rejected.length > 0) {
    throw new Error(
      `Mail server did not accept ${session.email}. ${info.response ?? ""}`.trim(),
    );
  }
  console.log(
    `Invoice ${session.invoiceId} accepted for ${session.email} (${info.messageId})`,
  );
}
