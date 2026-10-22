export function fileExtensionLabel(name: string): string {
  const base = name.trim();
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) return "FILE";
  return base.slice(dot + 1).toUpperCase();
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  const megabytes = bytes / (1024 * 1024);
  if (megabytes < 10) return `${megabytes.toFixed(1)} MB`;
  return `${Math.round(megabytes)} MB`;
}

export function formatAttachmentTotal(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024 * 1024) return formatFileSize(bytes);
  const megabytes = bytes / (1024 * 1024);
  if (megabytes < 100) return `${(Math.round(megabytes * 100) / 100).toFixed(2)} MB`;
  return formatFileSize(bytes);
}

export function attachmentDetail(name: string, bytes: number): string {
  return `${fileExtensionLabel(name)} · ${formatFileSize(bytes)}`;
}

const imageActivityPrefix = "image:";

export function imageActivityText(id: string, name: string): string {
  return `${imageActivityPrefix}${id}:${name}`;
}

export function imageAttachment(text: string): { id: string; name: string } | undefined {
  if (!text.startsWith(imageActivityPrefix)) return undefined;
  const rest = text.slice(imageActivityPrefix.length);
  const id = rest.slice(0, 36);
  if (rest.charAt(36) !== ":" || !/^[0-9a-f-]{36}$/i.test(id)) return undefined;
  return { id, name: rest.slice(37) || "Image" };
}

export function attachmentPreviewPath(id: string): string {
  return `/api/crm/conversations/attachments?id=${encodeURIComponent(id)}`;
}

const fileActivityPrefix = "file:";

export function fileActivityText(id: string, name: string): string {
  return `${fileActivityPrefix}${id}:${name}`;
}

export function fileAttachment(text: string): { id: string; name: string } | undefined {
  if (!text.startsWith(fileActivityPrefix)) return undefined;
  const rest = text.slice(fileActivityPrefix.length);
  const id = rest.slice(0, 36);
  if (rest.charAt(36) !== ":" || !/^[0-9a-f-]{36}$/i.test(id)) return undefined;
  return { id, name: rest.slice(37) || "File" };
}
