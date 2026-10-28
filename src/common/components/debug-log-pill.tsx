"use client";

import { Bug } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import type { AiActivityStatus } from "@/src/features/ai/types";

const copy = {
  logs: "Logs",
  ai: "AI",
  crm: "CRM",
  cpq: "CPQ",
  open: "Open debug logs",
  close: "Close debug logs",
  empty: "No logs yet.",
  detected: "Detected",
  none: "Nothing needed",
  error: "Error",
  model: "Model",
  deal: "Deal",
  activities: "Activities",
  prompt: "Prompt",
  raw: "Raw response",
  parsed: "Parsed response",
  migration: "Run supabase/migrate-feature-logs.sql in the Supabase SQL editor.",
};

const storageKey = "structure-pro-debug-logs";
const margin = 16;
const kinds = [
  { id: "ai", label: copy.ai },
  { id: "crm", label: copy.crm },
  { id: "cpq", label: copy.cpq },
] as const;

type LogKind = (typeof kinds)[number]["id"];

type DebugLog = {
  id: string;
  feature: string;
  status: AiActivityStatus;
  errorMessage: string | null;
  createdAt: string;
  rawResponse: string | null;
  parsedResponse: unknown;
  model?: string | null;
  dealId?: string | null;
  activityIds?: number[];
  executionTimeMs?: number;
  promptPayload?: unknown;
};

type LogSection = {
  kind: LogKind;
  logs: DebugLog[];
  errorCount: number;
  error: string | null;
};

const emptySections: LogSection[] = kinds.map((kind) => ({
  kind: kind.id,
  logs: [],
  errorCount: 0,
  error: null,
}));

type Edge = "left" | "right" | "top" | "bottom";
type Dock = { edge: Edge; ratio: number };
type Point = { x: number; y: number };
type Size = { width: number; height: number };

const statusLabel: Record<AiActivityStatus, string> = {
  detected: copy.detected,
  none: copy.none,
  error: copy.error,
};

const statusClass: Record<AiActivityStatus, string> = {
  detected: "bg-emerald-50 text-emerald-700",
  none: "bg-gray-100 text-gray-600",
  error: "bg-red-50 text-red-700",
};

function savedDock(): Dock {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return { edge: "bottom", ratio: 0 };
    const parsed = JSON.parse(raw) as Partial<Dock>;
    const edge = parsed.edge;
    const ratio = parsed.ratio;
    if (edge !== "left" && edge !== "right" && edge !== "top" && edge !== "bottom") {
      return { edge: "bottom", ratio: 0 };
    }
    if (typeof ratio !== "number" || !Number.isFinite(ratio)) return { edge, ratio: 0 };
    return { edge, ratio: Math.min(1, Math.max(0, ratio)) };
  } catch {
    return { edge: "bottom", ratio: 0 };
  }
}

function place(dock: Dock, viewport: Size, pill: Size): Point {
  const maxX = Math.max(margin, viewport.width - pill.width - margin);
  const maxY = Math.max(margin, viewport.height - pill.height - margin);
  const x = margin + (maxX - margin) * dock.ratio;
  const y = margin + (maxY - margin) * dock.ratio;
  if (dock.edge === "left") return { x: margin, y };
  if (dock.edge === "right") return { x: maxX, y };
  if (dock.edge === "top") return { x, y: margin };
  return { x, y: maxY };
}

function dockFor(point: Point, viewport: Size, pill: Size): Dock {
  const maxX = Math.max(margin, viewport.width - pill.width - margin);
  const maxY = Math.max(margin, viewport.height - pill.height - margin);
  const distances: Record<Edge, number> = {
    left: point.x,
    right: viewport.width - (point.x + pill.width),
    top: point.y,
    bottom: viewport.height - (point.y + pill.height),
  };
  const edge = (Object.entries(distances) as Array<[Edge, number]>).sort((left, right) => left[1] - right[1])[0][0];
  const span = edge === "left" || edge === "right" ? maxY - margin : maxX - margin;
  const start = edge === "left" || edge === "right" ? point.y - margin : point.x - margin;
  const ratio = span <= 0 ? 0 : Math.min(1, Math.max(0, start / span));
  return { edge, ratio };
}

function duration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function clock(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function pretty(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function loadErrorText(message: string): string {
  if (/could not find the table|schema cache|does not exist/i.test(message)) {
    return `${message} ${copy.migration}`;
  }
  return message;
}

function kindLabel(kind: LogKind): string {
  return kinds.find((item) => item.id === kind)?.label ?? kind;
}

const fallbackPill: Size = { width: 132, height: 36 };
const defaultDock: Dock = { edge: "bottom", ratio: 0 };
const emptyViewport: Size = { width: 0, height: 0 };
let viewportSnapshot = emptyViewport;
let dockSnapshot = defaultDock;
let dockRead = false;

function publishDock(next: Dock) {
  dockSnapshot = next;
  dockRead = true;
  window.localStorage.setItem(storageKey, JSON.stringify(next));
}

function subscribeViewport(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

function readViewport(): Size {
  const next = { width: window.innerWidth, height: window.innerHeight };
  if (next.width === viewportSnapshot.width && next.height === viewportSnapshot.height) return viewportSnapshot;
  viewportSnapshot = next;
  return viewportSnapshot;
}

function subscribeDock() {
  return () => undefined;
}

function readDock(): Dock {
  if (!dockRead) {
    dockSnapshot = savedDock();
    dockRead = true;
  }
  return dockSnapshot;
}

export function DebugLogPill() {
  const dock = useSyncExternalStore(subscribeDock, readDock, () => defaultDock);
  const viewport = useSyncExternalStore(subscribeViewport, readViewport, () => emptyViewport);
  const [drag, setDrag] = useState<Point | null>(null);
  const [pillSize, setPillSize] = useState<Size>(fallbackPill);
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const [sections, setSections] = useState<LogSection[]>(emptySections);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const pillObserver = useRef<ResizeObserver | null>(null);

  const pillRef = useCallback((node: HTMLButtonElement | null) => {
    pillObserver.current?.disconnect();
    pillObserver.current = null;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const width = node.offsetWidth;
      const height = node.offsetHeight;
      setPillSize((current) => (current.width === width && current.height === height ? current : { width, height }));
    });
    observer.observe(node);
    pillObserver.current = observer;
  }, []);

  useEffect(() => {
    let stopped = false;
    async function load() {
      try {
        const response = await fetch("/api/ai/activity-logs", { cache: "no-store" });
        if (!stopped) setShown(true);
        const body = (await response.json()) as { sections?: LogSection[]; error?: string };
        if (!response.ok) throw new Error(body.error || "Could not load logs");
        if (stopped) return;
        const next = kinds.map((kind) => {
          const found = body.sections?.find((item) => item.kind === kind.id);
          return {
            kind: kind.id,
            logs: Array.isArray(found?.logs) ? found.logs : [],
            errorCount: typeof found?.errorCount === "number" ? found.errorCount : 0,
            error: found?.error ?? null,
          };
        });
        setSections(next);
      } catch (error) {
        if (stopped) return;
        setShown(true);
        const message = error instanceof Error ? error.message : "Could not load logs";
        setSections(kinds.map((kind) => ({ kind: kind.id, logs: [], errorCount: 0, error: message })));
      }
    }
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 5000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointer(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  if (process.env.NODE_ENV !== "development" || !shown) return null;

  const measured = viewport.width > 0 && viewport.height > 0;
  const point = measured && drag ? drag : measured ? place(dock, viewport, pillSize) : { x: margin, y: margin };
  const placed = drag ? dockFor(point, viewport, pillSize) : dock;
  const errorCount = sections.reduce((sum, section) => sum + section.errorCount, 0);
  const loadError = sections.some((section) => section.error);
  const panelWidth = Math.min(420, Math.max(280, viewport.width - margin * 2));
  const space =
    placed.edge === "bottom"
      ? point.y - margin - 8
      : placed.edge === "top"
        ? viewport.height - (point.y + pillSize.height) - margin - 8
        : viewport.height - margin * 2;
  const panelMaxHeight = Math.min(520, Math.max(160, space));
  const panelLeft =
    placed.edge === "right"
      ? undefined
      : Math.min(
          Math.max(margin, placed.edge === "left" ? point.x + pillSize.width + 8 : point.x),
          viewport.width - panelWidth - margin,
        );
  const panelRight = placed.edge === "right" ? viewport.width - point.x + 8 : undefined;
  const panelTop =
    placed.edge === "bottom"
      ? undefined
      : Math.min(
          Math.max(margin, placed.edge === "top" ? point.y + pillSize.height + 8 : point.y),
          viewport.height - panelMaxHeight - margin,
        );
  const panelBottom = placed.edge === "bottom" ? viewport.height - point.y + 8 : undefined;

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    const button = event.currentTarget;
    button.setPointerCapture(event.pointerId);
    const origin = point;
    const startX = event.clientX;
    const startY = event.clientY;
    let moved = false;
    function move(next: PointerEvent) {
      const dx = next.clientX - startX;
      const dy = next.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      setDrag({
        x: Math.min(Math.max(margin, origin.x + dx), Math.max(margin, viewport.width - pillSize.width - margin)),
        y: Math.min(Math.max(margin, origin.y + dy), Math.max(margin, viewport.height - pillSize.height - margin)),
      });
    }
    function up(next: PointerEvent) {
      button.removeEventListener("pointermove", move);
      button.removeEventListener("pointerup", up);
      button.removeEventListener("pointercancel", up);
      if (!moved) {
        setDrag(null);
        setOpen((value) => !value);
        return;
      }
      const nextDock = dockFor({ x: origin.x + next.clientX - startX, y: origin.y + next.clientY - startY }, viewport, pillSize);
      publishDock(nextDock);
      setDrag(null);
    }
    button.addEventListener("pointermove", move);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointercancel", up);
  }

  return createPortal(
    <div ref={root} className="pointer-events-none fixed inset-0 z-[90]">
      {open ? (
        <section
          aria-label={copy.logs}
          className="pointer-events-auto fixed flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-950 shadow-xl"
          style={
            measured
              ? {
                  width: panelWidth,
                  maxHeight: panelMaxHeight,
                  left: panelLeft,
                  right: panelRight,
                  top: panelTop,
                  bottom: panelBottom,
                }
              : { width: 360, maxHeight: 420, left: margin, bottom: margin + 48 }
          }
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {sections.map((section) => (
              <section key={section.kind} aria-label={kindLabel(section.kind)}>
                <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-100 bg-white px-3 py-2">
                  <span className="rounded-full bg-gray-950 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {kindLabel(section.kind)}
                  </span>
                  <span
                    className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                      section.error || section.errorCount > 0 ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {section.error ? "!" : section.errorCount}
                  </span>
                </div>
                {section.error ? (
                  <p className="px-3 py-3 text-xs leading-relaxed text-red-700">{loadErrorText(section.error)}</p>
                ) : null}
                {!section.error && section.logs.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-gray-500">{copy.empty}</p>
                ) : null}
                <ul>
                  {section.logs.map((log) => {
                    const expanded = expandedId === log.id;
                    return (
                      <li key={log.id} className="border-b border-gray-100 last:border-b-0">
                        <button
                          type="button"
                          aria-expanded={expanded}
                          onClick={() => setExpandedId(expanded ? null : log.id)}
                          className="flex w-full cursor-pointer flex-col gap-1 px-3 py-2.5 text-left hover:bg-gray-50"
                        >
                          <span className="flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate font-mono text-[11px] font-medium text-gray-950">
                              {log.feature}
                            </span>
                            {typeof log.executionTimeMs === "number" ? (
                              <span className="shrink-0 text-[11px] text-gray-500">{duration(log.executionTimeMs)}</span>
                            ) : null}
                          </span>
                          <span className="flex items-center justify-between gap-3">
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusClass[log.status]}`}>
                              {statusLabel[log.status]}
                            </span>
                            <span className="shrink-0 text-[11px] text-gray-400">{clock(log.createdAt)}</span>
                          </span>
                          {log.errorMessage ? (
                            <span className="line-clamp-2 text-[11px] leading-relaxed text-red-700">{log.errorMessage}</span>
                          ) : null}
                        </button>
                        {expanded ? (
                          <div className="space-y-2 px-3 pb-3">
                            {section.kind === "ai" ? (
                              <>
                                <p className="text-[11px] text-gray-500">
                                  {copy.model}: {log.model || "—"}
                                </p>
                                <p className="truncate text-[11px] text-gray-500">
                                  {copy.deal}: {log.dealId || "—"}
                                </p>
                                <p className="text-[11px] text-gray-500">
                                  {copy.activities}: {log.activityIds && log.activityIds.length > 0 ? log.activityIds.join(", ") : "—"}
                                </p>
                                <LogBlock label={copy.prompt} value={pretty(log.promptPayload)} />
                              </>
                            ) : null}
                            <LogBlock label={copy.raw} value={log.rawResponse || ""} />
                            <LogBlock label={copy.parsed} value={pretty(log.parsedResponse)} />
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </section>
      ) : null}
      <button
        ref={pillRef}
        type="button"
        aria-expanded={open}
        aria-label={open ? copy.close : copy.open}
        onPointerDown={onPointerDown}
        className="pointer-events-auto fixed flex cursor-grab touch-none items-center gap-2 rounded-full border border-gray-800 bg-gray-950 py-1.5 pr-1.5 pl-3 text-white shadow-lg select-none active:cursor-grabbing"
        style={measured ? { left: point.x, top: point.y } : { left: margin, bottom: margin }}
      >
        <Bug className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
        <span className="text-xs font-semibold">{copy.logs}</span>
        <span
          className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
            loadError || errorCount > 0 ? "bg-red-500 text-white" : "bg-white/15 text-white"
          }`}
        >
          {loadError ? "!" : errorCount}
        </span>
      </button>
    </div>,
    document.body,
  );
}

function LogBlock({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold tracking-wide text-gray-400 uppercase">{label}</p>
      <pre className="max-h-40 overflow-auto rounded-md bg-gray-50 p-2 font-mono text-[10px] leading-relaxed whitespace-pre-wrap break-words text-gray-800">
        {value}
      </pre>
    </div>
  );
}
