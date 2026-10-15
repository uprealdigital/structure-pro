"use client";

import { Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const defaultDurationMs = 3000;
const fadeMs = 200;

export function Toast({
  message,
  actionLabel,
  dismissLabel,
  pending = false,
  durationMs = defaultDurationMs,
  onAction,
  onDismiss,
}: {
  message: string;
  actionLabel?: string;
  dismissLabel: string;
  pending?: boolean;
  durationMs?: number;
  onAction?: () => void;
  onDismiss: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  const timers = useRef<number[]>([]);

  function clearTimers() {
    for (const timer of timers.current) window.clearTimeout(timer);
    timers.current = [];
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const enter = window.requestAnimationFrame(() => {
      setShown(true);
      timers.current = [
        window.setTimeout(() => setShown(false), durationMs),
        window.setTimeout(() => dismiss.current(), durationMs + fadeMs),
      ];
    });
    return () => {
      window.cancelAnimationFrame(enter);
      clearTimers();
    };
  }, [mounted, durationMs]);

  function close() {
    if (pending) return;
    clearTimers();
    setShown(false);
    timers.current = [window.setTimeout(() => dismiss.current(), fadeMs)];
  }

  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed top-3 right-5 z-[60] flex max-w-[calc(100vw-2.5rem)] justify-end">
      <div
        role="status"
        className={`pointer-events-auto inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 py-1.5 pr-1.5 pl-2.5 shadow-xs transition-opacity duration-200 ${
          shown ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
          <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
        </span>
        <span className="max-w-md truncate text-sm text-gray-900" title={message}>
          {message}
        </span>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            disabled={pending}
            className="shrink-0 cursor-pointer text-sm font-medium text-gray-950 underline underline-offset-2 disabled:opacity-50"
          >
            {actionLabel}
          </button>
        ) : null}
        <button
          type="button"
          aria-label={dismissLabel}
          onClick={close}
          disabled={pending}
          className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-500 hover:bg-emerald-100 disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </div>,
    document.body,
  );
}
