"use client";

import { Check, X } from "lucide-react";
import { copy } from "@/src/i18n/en";

type ShareModalProps = {
  status: "saving" | "copied" | "error";
  url: string;
  error: string;
  onClose: () => void;
};

export function ShareModal({ status, url, error, onClose }: ShareModalProps) {
  const title =
    status === "copied"
      ? copy.shareCopiedTitle
      : status === "error"
        ? copy.shareError
        : copy.shareSaving;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label={copy.close}
        onClick={onClose}
        disabled={status === "saving"}
      />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 text-gray-900 shadow-2xl">
        <button
          type="button"
          aria-label={copy.close}
          onClick={onClose}
          disabled={status === "saving"}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="px-2 pt-6 pb-2 text-center">
          {status === "copied" ? (
            <Check
              className="mx-auto h-16 w-16 text-green-600"
              strokeWidth={2.25}
              aria-hidden
            />
          ) : null}
          <h2
            id="share-modal-title"
            className="mt-4 font-serif text-2xl font-bold tracking-tight text-gray-950"
          >
            {title}
          </h2>
          {status === "copied" ? (
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{copy.shareCopiedBody}</p>
          ) : null}
          {status === "error" && error && error !== copy.shareError ? (
            <p className="mt-2 text-sm leading-relaxed text-red-600">{error}</p>
          ) : null}
          {url ? (
            <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-left font-mono text-xs break-all text-gray-700">
              {url}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
