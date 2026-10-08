import nodemailer, { type SentMessageInfo } from "nodemailer";

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

export type MailAttachment = {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  cid?: string;
  contentDisposition?: string;
};

export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: MailAttachment[];
}): Promise<string> {
  const { transporter, user, from } = createGmailMailer();
  const info = await transporter.sendMail({
    from,
    to: input.to,
    envelope: { from: user, to: input.to },
    subject: input.subject,
    text: input.text,
    html: input.html,
    attachments: input.attachments,
  });
  const messageId = assertAccepted(info, input.to);
  return messageId ?? "";
}
