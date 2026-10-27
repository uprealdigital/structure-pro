"use client";

import { Ban, CopyPlus, EllipsisVertical, ExternalLink, FolderOutput, Link, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { copy } from "@/src/features/crm/conversations/locales/en";
import type { QuoteStatusAction } from "@/src/features/crm/quotes/config/status";

export function QuoteActionsMenu({
  quoteId,
  published,
  pending,
  adding,
  canMove,
  onAddQuote,
  onMove,
  onDuplicate,
  menuAction,
  onMenuAction,
  onCopied,
  onCopyError,
}: {
  quoteId: string;
  published: boolean;
  pending: boolean;
  adding: boolean;
  canMove: boolean;
  onAddQuote: () => void;
  onMove: () => void;
  onDuplicate: () => void;
  menuAction?: QuoteStatusAction;
  onMenuAction: () => void;
  onCopied: () => void;
  onCopyError: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(event: MouseEvent) {
      if (!menu.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openQuote() {
    setOpen(false);
    window.open(`/quote/${quoteId}?mode=internal`, "_blank", "noopener,noreferrer");
  }

  async function copyPublishLink() {
    setOpen(false);
    const url = `${window.location.origin}/quote/${quoteId}`;
    try {
      await navigator.clipboard.writeText(url);
      onCopied();
    } catch {
      onCopyError();
    }
  }

  return (
    <div ref={menu} className="relative self-center">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={copy.quoteActions}
        disabled={pending}
        onClick={() => setOpen((value) => !value)}
        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-transparent text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
      >
        <EllipsisVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label={copy.quoteActions}
          className="absolute top-full right-0 z-50 mt-1.5 w-52 rounded-xl border border-gray-200/90 bg-white p-1 shadow-xl"
        >
          <button
            type="button"
            role="menuitem"
            disabled={adding || pending}
            onClick={() => {
              setOpen(false);
              onAddQuote();
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-black disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5 shrink-0 text-gray-500" strokeWidth={2} aria-hidden="true" />
            <span>{adding ? copy.addingQuote : copy.addQuote}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={pending}
            onClick={() => {
              setOpen(false);
              onDuplicate();
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-black disabled:opacity-50"
          >
            <CopyPlus className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden="true" />
            <span>{copy.duplicateQuote}</span>
          </button>
          {canMove ? (
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                onMove();
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-black disabled:opacity-50"
            >
              <FolderOutput className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden="true" />
              <span>{copy.moveQuoteToNewDeal}</span>
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={openQuote}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-black"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden="true" />
            <span>{copy.openQuote}</span>
          </button>
          {published ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => void copyPublishLink()}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-black"
            >
              <Link className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden="true" />
              <span>{copy.copyPublishLink}</span>
            </button>
          ) : null}
          {menuAction ? (
            <>
              <div className="my-1 border-t border-gray-100" />
              <button
                type="button"
                role="menuitem"
                disabled={pending}
                onClick={() => {
                  setOpen(false);
                  onMenuAction();
                }}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                {menuAction.id === "delete_draft" ? (
                  <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <Ban className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                )}
                <span>{menuAction.label}</span>
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
