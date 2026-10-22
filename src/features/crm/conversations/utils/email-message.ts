import { fileAttachment, imageAttachment } from "@/src/features/crm/conversations/utils/attachments";

export type EmailAttachmentKind = "image" | "file";

export type EmailAttachment = {
  id: string;
  name: string;
  bytes: number;
  kind: EmailAttachmentKind;
};

export type EmailMessage = {
  subject: string;
  body: string;
  attachments: EmailAttachment[];
};

const marker = "email-v1\u001e";
const field = "\u001e";
const fileField = "\u001f";

function decoded(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function attachmentLine(value: string): EmailAttachment | undefined {
  const [kind, id, bytes, name] = value.split(fileField);
  if ((kind !== "image" && kind !== "file") || !id || !name) return undefined;
  const size = Number(bytes);
  return {
    kind,
    id,
    name: decoded(name),
    bytes: Number.isFinite(size) && size > 0 ? Math.round(size) : 0,
  };
}

function legacySubject(text: string): EmailMessage | undefined {
  const split = text.indexOf("\n\n");
  if (split <= 0) return undefined;
  const subject = text.slice(0, split).trim();
  if (!subject || subject.includes("\n") || subject.length > 180) return undefined;
  if (/[.!?,;:]$/.test(subject)) return undefined;
  if (!/^(re|fwd|subject)\s*:/i.test(subject) && !/quote\s*#/i.test(subject)) return undefined;
  return { subject, body: text.slice(split + 2), attachments: [] };
}

export function emailActivityText(message: EmailMessage): string {
  const files = message.attachments
    .filter((item) => item.id && item.name.trim())
    .map((item) =>
      [item.kind, item.id, String(Math.max(0, Math.round(item.bytes))), encodeURIComponent(item.name)].join(fileField),
    )
    .join(field);
  return `${marker}${encodeURIComponent(message.subject)}${field}${message.body}${field}${files}`;
}

export function parseEmailActivity(text: string): EmailMessage {
  if (text.startsWith(marker)) {
    const rest = text.slice(marker.length);
    const subjectEnd = rest.indexOf(field);
    if (subjectEnd < 0) return { subject: "", body: text, attachments: [] };
    const bodyEnd = rest.indexOf(field, subjectEnd + 1);
    const subject = decoded(rest.slice(0, subjectEnd));
    const body = bodyEnd < 0 ? rest.slice(subjectEnd + 1) : rest.slice(subjectEnd + 1, bodyEnd);
    const attachments =
      bodyEnd < 0
        ? []
        : rest
            .slice(bodyEnd + 1)
            .split(field)
            .map(attachmentLine)
            .filter((item): item is EmailAttachment => item != null);
    return { subject, body, attachments };
  }

  const image = imageAttachment(text);
  if (image) return { subject: "", body: "", attachments: [{ id: image.id, name: image.name, bytes: 0, kind: "image" }] };
  const file = fileAttachment(text);
  if (file) return { subject: "", body: "", attachments: [{ id: file.id, name: file.name, bytes: 0, kind: "file" }] };
  return legacySubject(text) ?? { subject: "", body: text, attachments: [] };
}
