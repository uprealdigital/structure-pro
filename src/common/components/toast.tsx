"use client";

import { Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const defaultDurationMs = 3000;
const fadeMs = 200;

export type ToastTone = "success" | "error" | "neutral";

const tones: Record<
  ToastTone,
  { panel: string; badge: string; close: string; icon: typeof Check }
> = {
  success: {
    panel: "border-emerald-200 bg-emerald-50",
    badge: "bg-emerald-500 text-white",
    close: "text-gray-500 hover:bg-emerald-100",
    icon: Check,
  },
  error: {
    panel: "border-red-200 bg-red-50",
    badge: "bg-red-500 text-white",
    close: "text-gray-500 hover:bg-red-100",
    icon: X,
  },
  neutral: {
    panel: "border-gray-200 bg-white",
    badge: "bg-gray-400 text-white",
    close: "text-gray-500 hover:bg-gray-100",
    icon: Check,
  },
};

export function Toast({
  message,
  actionLabel,
  dismissLabel,
  pending = false,
  durationMs = defaultDurationMs,
  tone = "success",
  onAction,
  onDismiss,
}: {
  message: string;
  actionLabel?: string;
  dismissLabel: string;
  pending?: boolean;
  durationMs?: number;
  tone?: ToastTone;
  onAction?: () => void;
  onDismiss: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  const timers = useRef<number[]>([]);
  const style = tones[tone];
  const Icon = style.icon;

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
        role={tone === "error" ? "alert" : "status"}
        className={`pointer-events-auto inline-flex max-w-full items-center gap-2 rounded-full border py-1.5 pr-1.5 pl-2.5 shadow-xs transition-opacity duration-200 ${style.panel} ${
          shown ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${style.badge}`}>
          <Icon className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
        </span>
        <span className="max-w-md truncate text-sm text-gray-900" title={message}>
          {message}
        </span>
        {actionLabel ? (
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
          className={`flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full disabled:opacity-50 ${style.close}`}
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </div>,
    document.body,
  );
}
