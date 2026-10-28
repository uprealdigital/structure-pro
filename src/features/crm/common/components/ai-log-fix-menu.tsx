"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Toast, type ToastTone } from "@/src/common/components/toast";
import {
  aiLogFixIntents,
  aiLogFixStatuses,
  buildAiLogFixPrompt,
  foundAiLogIntents,
  type AiLogFixIntent,
  type AiLogFixLog,
} from "@/src/features/ai/services/ai-log.service";
import type { AiActivityStatus } from "@/src/features/ai/types";
import { copy } from "@/src/features/crm/common/locales/en";

export type AiLogFixTarget = {
  log: AiLogFixLog;
  x: number;
  y: number;
};

const statusLabel: Record<AiActivityStatus, string> = {
  detected: copy.aiFixStatusDetected,
  none: copy.aiFixStatusNone,
  error: copy.aiFixStatusError,
};

const intentLabel: Record<AiLogFixIntent, string> = {
  configuration: copy.aiFixIntentConfiguration,
  quote_request: copy.aiFixIntentQuoteRequest,
  none: copy.aiFixIntentNone,
};

function place(x: number, y: number, width: number, height: number): { x: number; y: number } {
  return {
    x: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
    y: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
  };
}

function Choice({
  selected,
  disabled,
  label,
  role = "checkbox",
  onSelect,
}: {
  selected: boolean;
  disabled?: boolean;
  label: string;
  role?: "checkbox" | "radio";
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${
        disabled ? "cursor-default text-gray-400" : "cursor-pointer text-gray-800 hover:bg-gray-50"
      }`}
    >
      <span
        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
          selected
            ? disabled
              ? "border-gray-300 bg-gray-300 text-white"
              : "border-gray-950 bg-gray-950 text-white"
            : disabled
              ? "border-gray-200 bg-gray-50"
              : "border-gray-300 bg-white"
        }`}
      >
        {selected ? <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" /> : null}
      </span>
      {label}
    </button>
  );
}

function AiLogFixPanel({
  target,
  onClose,
  onToast,
}: {
  target: AiLogFixTarget;
  onClose: () => void;
  onToast: (toast: { id: number; message: string; tone: ToastTone }) => void;
}) {
  const foundIntents = foundAiLogIntents(target.log.parsedResponse);
  const [phase, setPhase] = useState<"menu" | "picker">("menu");
  const [expectedStatus, setExpectedStatus] = useState<AiActivityStatus>(target.log.status);
  const [expectedIntents, setExpectedIntents] = useState<AiLogFixIntent[]>(foundIntents);
  const [copying, setCopying] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const width = phase === "menu" ? 168 : 288;
  const height = phase === "menu" ? 44 : 520;
  const point = place(target.x, target.y, width, height);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (panel.current?.contains(event.target as Node)) return;
      if (event.target instanceof Element && event.target.closest("[role='status'], [role='alert']")) return;
      onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    }
    function onScroll(event: Event) {
      if (panel.current?.contains(event.target as Node)) return;
      onClose();
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [onClose]);

  function toggleIntent(intent: AiLogFixIntent) {
    setExpectedIntents((current) => {
      if (intent === "none") return ["none"];
      const next = current.filter((item) => item !== "none" && item !== intent);
      if (current.includes(intent)) return next.length > 0 ? next : ["none"];
      return [...next, intent];
    });
  }

  async function copyFix() {
    if (copying) return;
    setCopying(true);
    const text = buildAiLogFixPrompt({
      log: target.log,
      expectedStatus,
      expectedIntents,
    });
    try {
      await navigator.clipboard.writeText(text);
      onToast({ id: Date.now(), message: copy.aiFixCopied, tone: "success" });
      onClose();
    } catch {
      onToast({ id: Date.now(), message: copy.aiFixCopyError, tone: "error" });
    } finally {
      setCopying(false);
    }
  }

  return (
    <div
      ref={panel}
      data-ai-log-fix=""
      role={phase === "menu" ? "menu" : "dialog"}
      aria-label={copy.aiFixMenu}
      onContextMenu={(event) => event.preventDefault()}
      className="pointer-events-auto fixed z-[100] rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
      style={{ left: point.x, top: point.y, width }}
    >
      {phase === "menu" ? (
        <button
          type="button"
          role="menuitem"
          onClick={() => setPhase("picker")}
          className="flex w-full cursor-pointer items-center rounded-md px-2.5 py-1.5 text-left text-xs font-medium whitespace-nowrap text-gray-800 hover:bg-gray-100"
        >
          {copy.aiFixMenu}
        </button>
      ) : (
        <div className="max-h-[min(32rem,calc(100vh-1rem))] overflow-y-auto p-1">
          <p className="px-2 pt-1 text-[10px] font-semibold tracking-wide text-gray-400 uppercase">{copy.aiFixFound}</p>
          <p className="px-2 pt-1.5 pb-0.5 text-[10px] font-semibold tracking-wide text-gray-400 uppercase">{copy.aiFixStatus}</p>
          <div role="radiogroup" aria-label={copy.aiFixStatus}>
            {aiLogFixStatuses.map((status) => (
              <Choice key={status} role="radio" selected={target.log.status === status} disabled label={statusLabel[status]} />
            ))}
          </div>
          <p className="px-2 pt-1.5 pb-0.5 text-[10px] font-semibold tracking-wide text-gray-400 uppercase">{copy.aiFixIntent}</p>
          <div role="group" aria-label={copy.aiFixIntent}>
            {aiLogFixIntents.map((intent) => (
              <Choice key={intent} selected={foundIntents.includes(intent)} disabled label={intentLabel[intent]} />
            ))}
          </div>
          <p className="mt-1 border-t border-gray-100 px-2 pt-2 text-[10px] font-semibold tracking-wide text-gray-400 uppercase">
            {copy.aiFixExpected}
          </p>
          <p className="px-2 pt-1.5 pb-0.5 text-[10px] font-semibold tracking-wide text-gray-400 uppercase">{copy.aiFixStatus}</p>
          <div role="radiogroup" aria-label={copy.aiFixStatus}>
            {aiLogFixStatuses.map((status) => (
              <Choice
                key={status}
                role="radio"
                selected={expectedStatus === status}
                label={statusLabel[status]}
                onSelect={() => setExpectedStatus(status)}
              />
            ))}
          </div>
          <p className="px-2 pt-1.5 pb-0.5 text-[10px] font-semibold tracking-wide text-gray-400 uppercase">{copy.aiFixIntent}</p>
          <div role="group" aria-label={copy.aiFixIntent}>
            {aiLogFixIntents.map((intent) => (
              <Choice
                key={intent}
                selected={expectedIntents.includes(intent)}
                label={intentLabel[intent]}
                onSelect={() => toggleIntent(intent)}
              />
            ))}
          </div>
          <button
            type="button"
            disabled={copying}
            onClick={() => void copyFix()}
            className="mt-2 w-full cursor-pointer rounded-md bg-gray-950 px-2 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 disabled:cursor-default disabled:opacity-60"
          >
            {copy.aiFixCopy}
          </button>
        </div>
      )}
    </div>
  );
}

export function AiLogFixMenu({
  target,
  onClose,
}: {
  target: AiLogFixTarget | null;
  onClose: () => void;
}) {
  const [toast, setToast] = useState<{ id: number; message: string; tone: ToastTone } | null>(null);

  return (
    <>
      {target ? (
        <AiLogFixPanel key={`${target.log.id}:${target.x}:${target.y}`} target={target} onClose={onClose} onToast={setToast} />
      ) : null}
      {toast ? (
        <Toast
          key={toast.id}
          message={toast.message}
          tone={toast.tone}
          dismissLabel={copy.aiFixDismiss}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </>
  );
}
