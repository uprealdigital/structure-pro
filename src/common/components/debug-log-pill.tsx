"use client";

import { Bug, Check, Filter } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { emptyLogLevelCounts, logLevels, type LogLevel, type LogLevelCounts } from "@/src/common/utils/log-level";
import type { AiActivityStatus } from "@/src/features/ai/types";
import { AiLogFixMenu, type AiLogFixTarget } from "@/src/features/crm/common/components/ai-log-fix-menu";

const copy = {
  logs: "Logs",
  ai: "AI",
  crm: "CRM",
  cpq: "CPQ",
  open: "Open debug logs",
  close: "Close debug logs",
  empty: "No unread logs.",
  detected: "Detected",
  none: "Nothing needed",
  error: "Error",
  warning: "Warning",
  info: "Info",
  statusGroup: "Status",
  levelGroup: "Level",
  clear: "Clear",
  clearAll: "Clear all",
  clearing: "Clearing",
  filters: "Filters",
  clearAi: "Clear AI logs",
  clearCrm: "Clear CRM logs",
  clearCpq: "Clear CPQ logs",
  clearEvery: "Clear all logs",
  model: "Model",
  deal: "Deal",
  activities: "Activities",
  prompt: "Prompt",
  raw: "Raw response",
  parsed: "Parsed response",
  migration: "Run supabase/migrate-feature-logs.sql in the Supabase SQL editor.",
  readAtMigration: "Run supabase/migrate-feature-log-read-at.sql in the Supabase SQL editor.",
  levelMigration: "Run supabase/migrate-feature-log-level.sql in the Supabase SQL editor.",
};

const storageKey = "structure-pro-debug-logs";
const statusStorageKey = "structure-pro-debug-log-statuses-v2";
const levelStorageKey = "structure-pro-debug-log-levels";
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
  logLevel: LogLevel;
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
  unreadCount: number;
  unreadByLevel: LogLevelCounts;
  error: string | null;
};

const emptySections: LogSection[] = kinds.map((kind) => ({
  kind: kind.id,
  logs: [],
  unreadCount: 0,
  unreadByLevel: emptyLogLevelCounts(),
  error: null,
}));

const statusOptions: AiActivityStatus[] = ["error", "detected", "none"];
const defaultStatuses: AiActivityStatus[] = ["error", "detected", "none"];
const defaultLevels: LogLevel[] = ["error"];

type Edge = "left" | "right" | "top" | "bottom";
type Dock = { edge: Edge; ratio: number };
type Point = { x: number; y: number };
type Size = { width: number; height: number };

const statusLabel: Record<AiActivityStatus, string> = {
  detected: copy.detected,
  none: copy.none,
  error: copy.error,
};

const levelLabel: Record<LogLevel, string> = {
  error: copy.error,
  warning: copy.warning,
  info: copy.info,
};

const levelClass: Record<LogLevel, string> = {
  error: "bg-red-50 text-red-700",
  warning: "bg-yellow-50 text-yellow-800",
  info: "bg-gray-100 text-gray-600",
};

const levelBadgeClass: Record<LogLevel, string> = {
  error: "bg-red-500 text-white",
  warning: "bg-yellow-400 text-gray-950",
  info: "bg-gray-500 text-white",
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
  if (/log_level/i.test(message)) return `${message} ${copy.levelMigration}`;
  if (/read_at/i.test(message)) return `${message} ${copy.readAtMigration}`;
  if (/could not find the table|schema cache|does not exist/i.test(message)) {
    return `${message} ${copy.migration}`;
  }
  return message;
}

function sameStatuses(left: AiActivityStatus[], right: AiActivityStatus[]): boolean {
  return left.length === right.length && left.every((status, index) => status === right[index]);
}

function countsFrom(value: unknown): LogLevelCounts {
  const counts = emptyLogLevelCounts();
  if (!value || typeof value !== "object") return counts;
  const record = value as Record<string, unknown>;
  for (const level of logLevels) {
    const count = record[level];
    if (typeof count === "number" && Number.isFinite(count)) counts[level] = count;
  }
  return counts;
}

function sameLevels(left: LogLevel[], right: LogLevel[]): boolean {
  return left.length === right.length && left.every((level, index) => level === right[index]);
}

function savedLevels(): LogLevel[] {
  try {
    const raw = window.localStorage.getItem(levelStorageKey);
    if (!raw) return defaultLevels;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return defaultLevels;
    return logLevels.filter((level) => parsed.includes(level));
  } catch {
    return defaultLevels;
  }
}

function savedStatuses(): AiActivityStatus[] {
  try {
    const raw = window.localStorage.getItem(statusStorageKey);
    if (!raw) return defaultStatuses;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return defaultStatuses;
    return statusOptions.filter((status) => parsed.includes(status));
  } catch {
    return defaultStatuses;
  }
}

function kindLabel(kind: LogKind): string {
  return kinds.find((item) => item.id === kind)?.label ?? kind;
}

function clearName(kind: LogKind): string {
  if (kind === "ai") return copy.clearAi;
  if (kind === "crm") return copy.clearCrm;
  return copy.clearCpq;
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
  const [statuses, setStatuses] = useState<AiActivityStatus[]>(defaultStatuses);
  const [levels, setLevels] = useState<LogLevel[]>(defaultLevels);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fixTarget, setFixTarget] = useState<AiLogFixTarget | null>(null);
  const [clearing, setClearing] = useState<LogKind | "all" | null>(null);
  const [clearError, setClearError] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const filterRoot = useRef<HTMLDivElement>(null);
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

  const statusKey = statuses.join(",");
  const levelKey = levels.join(",");
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const response = await fetch(
        `/api/ai/activity-logs?statuses=${encodeURIComponent(statusKey)}&levels=${encodeURIComponent(levelKey)}`,
        { cache: "no-store" },
      );
      const body = (await response.json()) as { sections?: LogSection[]; error?: string };
      if (id !== requestId.current) return;
      setShown(true);
      if (!response.ok) throw new Error(body.error || "Could not load logs");
      const next = kinds.map((kind) => {
        const found = body.sections?.find((item) => item.kind === kind.id);
        return {
          kind: kind.id,
          logs: Array.isArray(found?.logs) ? found.logs : [],
          unreadCount: typeof found?.unreadCount === "number" ? found.unreadCount : 0,
          unreadByLevel: countsFrom(found?.unreadByLevel),
          error: found?.error ?? null,
        };
      });
      setSections(next);
    } catch (error) {
      if (id !== requestId.current) return;
      setShown(true);
      const message = error instanceof Error ? error.message : "Could not load logs";
      setSections(
        kinds.map((kind) => ({
          kind: kind.id,
          logs: [],
          unreadCount: 0,
          unreadByLevel: emptyLogLevelCounts(),
          error: message,
        })),
      );
    }
  }, [statusKey, levelKey]);

  useEffect(() => {
    const saved = savedStatuses();
    const savedLevel = savedLevels();
    setStatuses((current) => (sameStatuses(saved, current) ? current : saved));
    setLevels((current) => (sameLevels(savedLevel, current) ? current : savedLevel));
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 5000);
    return () => {
      requestId.current += 1;
      window.clearInterval(timer);
    };
  }, [load]);

  useEffect(() => {
    if (open) return;
    setFixTarget(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setFiltersOpen(false);
        setOpen(false);
      }
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
  const unreadCount = sections.reduce((sum, section) => sum + section.unreadCount, 0);
  const levelCounts = sections.reduce((sum, section) => {
    for (const level of logLevels) sum[level] += section.unreadByLevel[level] ?? 0;
    return sum;
  }, emptyLogLevelCounts());
  const visibleLevels = logLevels.filter((level) => levels.includes(level));
  const loadError = sections.some((section) => section.error != null && section.error !== "");
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
        setFiltersOpen(false);
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

  function toggleLevel(level: LogLevel) {
    setLevels((current) => {
      const next = current.includes(level)
        ? current.filter((item) => item !== level)
        : logLevels.filter((item) => item === level || current.includes(item));
      window.localStorage.setItem(levelStorageKey, JSON.stringify(next));
      return next;
    });
  }

  function toggleStatus(status: AiActivityStatus) {
    setStatuses((current) => {
      const next = current.includes(status)
        ? current.filter((item) => item !== status)
        : statusOptions.filter((item) => item === status || current.includes(item));
      window.localStorage.setItem(statusStorageKey, JSON.stringify(next));
      return next;
    });
  }

  async function clear(kind: LogKind | "all") {
    if (clearing) return;
    setClearing(kind);
    setClearError(null);
    setFiltersOpen(false);
    try {
      const response = await fetch("/api/ai/activity-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, statuses, levels }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Could not clear logs");
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not clear logs";
      setClearError(loadErrorText(message));
      await load();
    } finally {
      setClearing(null);
    }
  }

  function onPanelPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (!filterRoot.current?.contains(event.target as Node)) setFiltersOpen(false);
  }

  const filtersChanged = !sameStatuses(statuses, defaultStatuses) || !sameLevels(levels, defaultLevels);
  const actionClass =
    "cursor-pointer rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-100 disabled:cursor-default disabled:text-gray-300 disabled:hover:bg-transparent";

  return createPortal(
    <div ref={root} className="pointer-events-none fixed inset-0 z-[90]">
      {open ? (
        <section
          aria-label={copy.logs}
          onPointerDown={onPanelPointerDown}
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
          <div className="relative z-20 flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-3 py-2">
            <div ref={filterRoot} className="relative">
              <button
                type="button"
                aria-expanded={filtersOpen}
                aria-haspopup="menu"
                onClick={() => setFiltersOpen((value) => !value)}
                className={`flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                  filtersOpen || filtersChanged ? "bg-gray-950 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Filter className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                {copy.filters}
              </button>
              {filtersOpen ? (
                <div
                  role="menu"
                  aria-label={copy.filters}
                  className="absolute top-full left-0 z-30 mt-1 w-48 rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
                >
                  <p className="px-2 pt-1 pb-0.5 text-[10px] font-semibold tracking-wide text-gray-400 uppercase">
                    {copy.statusGroup}
                  </p>
                  {statusOptions.map((status) => {
                    const selected = statuses.includes(status);
                    return (
                      <button
                        key={status}
                        type="button"
                        role="menuitemcheckbox"
                        aria-checked={selected}
                        onClick={() => toggleStatus(status)}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-gray-800 hover:bg-gray-50"
                      >
                        <span
                          className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                            selected ? "border-gray-950 bg-gray-950 text-white" : "border-gray-300 bg-white"
                          }`}
                        >
                          {selected ? <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" /> : null}
                        </span>
                        {statusLabel[status]}
                      </button>
                    );
                  })}
                  <p className="mt-1 border-t border-gray-100 px-2 pt-2 pb-0.5 text-[10px] font-semibold tracking-wide text-gray-400 uppercase">
                    {copy.levelGroup}
                  </p>
                  {logLevels.map((level) => {
                    const selected = levels.includes(level);
                    return (
                      <button
                        key={level}
                        type="button"
                        role="menuitemcheckbox"
                        aria-checked={selected}
                        onClick={() => toggleLevel(level)}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-gray-800 hover:bg-gray-50"
                      >
                        <span
                          className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                            selected ? "border-gray-950 bg-gray-950 text-white" : "border-gray-300 bg-white"
                          }`}
                        >
                          {selected ? <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" /> : null}
                        </span>
                        {levelLabel[level]}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              aria-label={copy.clearEvery}
              onClick={() => void clear("all")}
              disabled={clearing !== null || unreadCount === 0}
              className={actionClass}
            >
              {clearing === "all" ? copy.clearing : copy.clearAll}
            </button>
          </div>
          {clearError ? (
            <p className="shrink-0 border-b border-gray-100 px-3 py-2 text-xs leading-relaxed text-red-700">{clearError}</p>
          ) : null}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {sections.map((section) => (
              <section key={section.kind} aria-label={kindLabel(section.kind)}>
                <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-100 bg-white px-3 py-2">
                  <span className="text-[11px] font-bold text-gray-950">{kindLabel(section.kind)}</span>
                  <span className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={clearName(section.kind)}
                      onClick={() => void clear(section.kind)}
                      disabled={clearing !== null || section.unreadCount === 0}
                      className={actionClass}
                    >
                      {clearing === section.kind ? copy.clearing : copy.clear}
                    </button>
                    <span
                      className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                        section.error || section.unreadCount > 0 ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {section.error ? "!" : section.unreadCount}
                    </span>
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
                      <li
                        key={log.id}
                        className="border-b border-gray-100 last:border-b-0"
                        onContextMenu={
                          section.kind === "ai"
                            ? (event) => {
                                event.preventDefault();
                                setFiltersOpen(false);
                                setFixTarget({ log, x: event.clientX, y: event.clientY });
                              }
                            : undefined
                        }
                      >
                        <button
                          type="button"
                          aria-expanded={expanded}
                          onClick={() => setExpandedId(expanded ? null : log.id)}
                          className="flex w-full cursor-pointer flex-col gap-1 px-3 py-2.5 text-left hover:bg-gray-50"
                        >
                          <span className="flex items-center justify-between gap-3">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="min-w-0 truncate font-mono text-[11px] font-medium text-gray-950">
                                {log.feature}
                              </span>
                              <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                                {statusLabel[log.status]}
                              </span>
                            </span>
                            {typeof log.executionTimeMs === "number" ? (
                              <span className="shrink-0 text-[11px] text-gray-500">{duration(log.executionTimeMs)}</span>
                            ) : null}
                          </span>
                          <span className="flex items-center justify-between gap-3">
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${levelClass[log.logLevel] ?? levelClass.info}`}
                            >
                              {levelLabel[log.logLevel] ?? log.logLevel}
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
        {loadError ? (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-semibold text-white">
            !
          </span>
        ) : visibleLevels.length === 0 ? (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-white/15 px-1.5 py-0.5 text-[11px] font-semibold text-white">
            0
          </span>
        ) : (
          visibleLevels.map((level) => (
            <span
              key={level}
              className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${levelBadgeClass[level]}`}
            >
              {levelCounts[level]}
            </span>
          ))
        )}
      </button>
      <AiLogFixMenu target={fixTarget} onClose={() => setFixTarget(null)} />
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
