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

export function attachmentDetail(name: string, bytes: number): string {
  return `${fileExtensionLabel(name)} · ${formatFileSize(bytes)}`;
}
