export type MessagePart =
  | { kind: "text"; value: string }
  | { kind: "link"; href: string; label: string };

const linkPattern = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const trailingPunctuation = /[.,;:!?)\]]+$/;

function linkHref(label: string): string | undefined {
  const href = /^www\./i.test(label) ? `https://${label}` : label;
  try {
    const url = new URL(href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

export function messageParts(text: string): MessagePart[] {
  const parts: MessagePart[] = [];
  let cursor = 0;
  for (const match of text.matchAll(linkPattern)) {
    const raw = match[0];
    const index = match.index ?? 0;
    const label = raw.replace(trailingPunctuation, "");
    const href = label ? linkHref(label) : undefined;
    if (!href || index < cursor) continue;
    if (index > cursor) parts.push({ kind: "text", value: text.slice(cursor, index) });
    parts.push({ kind: "link", href, label });
    const consumed = index + label.length;
    if (consumed < index + raw.length) parts.push({ kind: "text", value: text.slice(consumed, index + raw.length) });
    cursor = index + raw.length;
  }
  if (cursor < text.length) parts.push({ kind: "text", value: text.slice(cursor) });
  return parts.length > 0 ? parts : [{ kind: "text", value: text }];
}
