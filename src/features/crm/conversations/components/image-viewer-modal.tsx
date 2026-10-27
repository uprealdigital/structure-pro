"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Toast } from "@/src/common/components/toast";
import { copy } from "@/src/features/crm/conversations/locales/en";

function imageFileName(name: string, type: string): string {
  const cleaned = name.trim().replace(/[\\/:*?"<>|]/g, "").slice(0, 180) || "image";
  if (/\.[a-z0-9]{1,8}$/i.test(cleaned)) return cleaned;
  const subtype = type.split("/")[1]?.split(";")[0]?.split("+")[0] ?? "";
  const extension = subtype === "jpeg" ? "jpg" : subtype;
  if (!extension || !/^[a-z0-9]+$/i.test(extension)) return cleaned;
  return `${cleaned}.${extension}`;
}

export async function downloadImage(src: string, name: string) {
  const response = await fetch(src);
  if (!response.ok) throw new Error(copy.downloadImageFailed);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = imageFileName(name, blob.type || response.headers.get("Content-Type") || "");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function ImageViewerModal({
  src,
  name,
  onClose,
}: {
  src: string;
  name: string;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ id: number; message: string } | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await downloadImage(src, name);
    } catch {
      setError({ id: Date.now(), message: copy.downloadImageFailed });
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <button type="button" className="absolute inset-0 cursor-default" aria-label={copy.close} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={copy.viewImage(name)}
        className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <button
          type="button"
          aria-label={copy.close}
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </button>
        <div className="min-h-0 px-3 pt-12 pb-3">
          <img src={src} alt={name} className="mx-auto max-h-[min(70vh,760px)] w-full rounded-2xl object-contain" />
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 px-4 pt-1 pb-4">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-800 shadow-xs transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            <Download className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            {copy.download}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-800"
          >
            {copy.ok}
          </button>
        </footer>
      </div>
      {error ? (
        <Toast
          key={error.id}
          message={error.message}
          tone="error"
          dismissLabel={copy.dismiss}
          onDismiss={() => setError(null)}
        />
      ) : null}
    </div>,
    document.body,
  );
}
