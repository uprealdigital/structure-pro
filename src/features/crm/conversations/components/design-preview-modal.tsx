"use client";

import dynamic from "next/dynamic";
import { Check, ChevronDown, DollarSign, Minus, Plus, RotateCw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { BuildingCapture } from "@/src/features/cpq/components/building-scene";
import type { DesignAngle } from "@/src/features/cpq/components/building-view";
import { toBuildingConfig } from "@/src/features/cpq/utils/mappers";
import { copy } from "@/src/features/crm/conversations/locales/en";
import type { ConversationQuoteRevision } from "@/src/features/crm/conversations/types";
import {
  designPreviewChanges,
  type DesignPreviewChange,
} from "@/src/features/crm/conversations/utils/design-preview";

const BuildingView = dynamic(() => import("@/src/features/cpq/components/building-view"), {
  ssr: false,
});

const visibleChangeCount = 4;
const maxDesignViews = 4;
const defaultAngles: DesignAngle[] = ["left", "right", "top", "front"];

const angleLabel: Record<DesignAngle, string> = {
  left: copy.designAngleLeft,
  right: copy.designAngleRight,
  top: copy.designAngleTop,
  front: copy.designAngleFront,
};

type DesignView = {
  id: string;
  angle: DesignAngle;
};

type DesignPreviewModalProps = {
  current: ConversationQuoteRevision;
  previous: ConversationQuoteRevision | null;
  onClose: () => void;
  onAttach: (file: File) => void;
};

function createView(angle: DesignAngle): DesignView {
  return { id: crypto.randomUUID(), angle };
}

function ChangeIcon({ kind }: { kind: DesignPreviewChange["kind"] }) {
  const className = "mt-0.5 h-3.5 w-3.5 shrink-0";
  if (kind === "price") return <DollarSign className={className} strokeWidth={2.4} aria-hidden="true" />;
  if (kind === "added") return <Plus className={className} strokeWidth={2.4} aria-hidden="true" />;
  if (kind === "removed") return <Minus className={className} strokeWidth={2.4} aria-hidden="true" />;
  return <Check className={className} strokeWidth={2.4} aria-hidden="true" />;
}

function roundedCell(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

async function composeDesignPreview(blobs: Blob[]): Promise<File> {
  const images = await Promise.all(blobs.map((blob) => createImageBitmap(blob)));
  const columns = images.length > 1 ? 2 : 1;
  const rows = Math.ceil(images.length / columns);
  const cellWidth = 960;
  const cellHeight = 720;
  const gap = 28;
  const pad = 36;
  const radius = 28;
  const width = pad * 2 + columns * cellWidth + (columns - 1) * gap;
  const height = pad * 2 + rows * cellHeight + (rows - 1) * gap;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error(copy.designPreviewAttachFailed);
  context.fillStyle = "#f3f4f6";
  context.fillRect(0, 0, width, height);
  images.forEach((image, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = pad + column * (cellWidth + gap);
    const y = pad + row * (cellHeight + gap);
    const scale = Math.min(cellWidth / image.width, cellHeight / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    context.save();
    roundedCell(context, x, y, cellWidth, cellHeight, radius);
    context.clip();
    context.fillStyle = "#ffffff";
    context.fillRect(x, y, cellWidth, cellHeight);
    context.drawImage(image, x + (cellWidth - drawWidth) / 2, y + (cellHeight - drawHeight) / 2, drawWidth, drawHeight);
    context.restore();
    image.close();
  });
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result || result.size === 0) {
        reject(new Error(copy.designPreviewAttachFailed));
        return;
      }
      resolve(result);
    }, "image/jpeg", 0.9);
  });
  return new File([blob], copy.designPreviewFileName, { type: "image/jpeg" });
}

function DesignAngleCard({
  view,
  config,
  captures,
  placement,
  removable,
  onRemove,
}: {
  view: DesignView;
  config: ReturnType<typeof toBuildingConfig>;
  captures: Map<string, () => BuildingCapture | null>;
  placement: "cell" | "full" | "center";
  removable: boolean;
  onRemove: (id: string) => void;
}) {
  const captureRef = useRef<BuildingCapture | null>(null);

  useEffect(() => {
    captures.set(view.id, () => captureRef.current);
    return () => {
      captures.delete(view.id);
    };
  }, [captures, view.id]);

  const placementClass =
    placement === "full"
      ? "col-span-2 aspect-[4/3]"
      : placement === "center"
        ? "col-span-2 aspect-[4/3] w-[calc(50%-0.375rem)] justify-self-center"
        : "aspect-[4/3]";

  return (
    <li
      className={`relative overflow-hidden rounded-xl border border-gray-200 bg-white ${placementClass}`}
      onWheel={(event) => event.stopPropagation()}
    >
      <BuildingView config={config} angle={view.angle} label={angleLabel[view.angle]} captureRef={captureRef} />
      {removable ? (
        <button
          type="button"
          aria-label={copy.removeDesignView}
          onClick={() => onRemove(view.id)}
          className="absolute top-2.5 left-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-800"
        >
          <X className="h-3 w-3" strokeWidth={2.2} aria-hidden="true" />
        </button>
      ) : null}
    </li>
  );
}

export function DesignPreviewModal({ current, previous, onClose, onAttach }: DesignPreviewModalProps) {
  const [views, setViews] = useState<DesignView[]>(() => defaultAngles.map(createView));
  const [expanded, setExpanded] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [error, setError] = useState("");
  const captures = useRef(new Map<string, () => BuildingCapture | null>());
  const viewCount = useRef(views.length);
  const listEnd = useRef<HTMLDivElement>(null);
  const config = toBuildingConfig(current.selections);
  const changes = previous ? designPreviewChanges(previous.selections, current.selections) : [];
  const hiddenChanges = Math.max(0, changes.length - visibleChangeCount);
  const shown = expanded ? changes : changes.slice(0, visibleChangeCount);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !attaching) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [attaching, onClose]);

  useEffect(() => {
    if (views.length > viewCount.current) listEnd.current?.scrollIntoView({ block: "nearest" });
    viewCount.current = views.length;
  }, [views.length]);

  function addView() {
    if (views.length >= maxDesignViews) return;
    const angle = defaultAngles[views.length % defaultAngles.length];
    setViews((currentViews) => [...currentViews, createView(angle)]);
  }

  function removeView(id: string) {
    setViews((currentViews) => (currentViews.length <= 1 ? currentViews : currentViews.filter((view) => view.id !== id)));
  }

  async function attach() {
    if (attaching || views.length === 0) return;
    setAttaching(true);
    setError("");
    try {
      const blobs: Blob[] = [];
      for (const view of views) {
        const capture = captures.current.get(view.id)?.();
        if (!capture) throw new Error(copy.designPreviewViewsLoading);
        blobs.push(await capture());
      }
      onAttach(await composeDesignPreview(blobs));
    } catch (caught) {
      setError(caught instanceof Error && caught.message === copy.designPreviewViewsLoading ? caught.message : copy.designPreviewAttachFailed);
      setAttaching(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={() => {
        if (!attaching) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="design-preview-title"
        onMouseDown={(event) => event.stopPropagation()}
        className="flex max-h-[min(860px,calc(100vh-2rem))] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl bg-white text-gray-900 shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between gap-4 px-6 pt-5 pb-3">
          <h2 id="design-preview-title" className="text-base font-semibold tracking-tight text-gray-950">
            {copy.designPreviewTitle}
          </h2>
          <button
            type="button"
            aria-label={copy.close}
            disabled={attaching}
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-4">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">{copy.designPreviewChanges}</h3>
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gray-200 px-1 text-[10px] font-semibold text-gray-600">
              {changes.length}
            </span>
          </div>
          {changes.length === 0 ? (
            <p className="text-xs text-gray-500">{previous ? copy.noChangesSinceSent : copy.noEarlierSentRevision}</p>
          ) : (
            <ul className="space-y-1.5">
              {shown.map((change) => (
                <li key={change.id} className="flex items-start gap-2 text-xs leading-5 font-medium text-green-600">
                  <ChangeIcon kind={change.kind} />
                  <span>{change.text}</span>
                </li>
              ))}
            </ul>
          )}
          {hiddenChanges > 0 ? (
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((open) => !open)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-gray-500 transition-colors hover:text-gray-800"
            >
              <span>{expanded ? copy.hideChanges : copy.seeMoreChanges(hiddenChanges)}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
          ) : null}

          <div className="mt-6 mb-3 flex items-center justify-between gap-3">
            <h3 className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">{copy.designPreviewAngles}</h3>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-400">
              <RotateCw className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              {copy.designPreviewRotate}
            </span>
          </div>
          <ul className="grid grid-cols-2 gap-3">
            {views.map((view, index) => (
              <DesignAngleCard
                key={view.id}
                view={view}
                config={config}
                captures={captures.current}
                placement={views.length === 1 ? "full" : views.length === 3 && index === 2 ? "center" : "cell"}
                removable={views.length > 1}
                onRemove={removeView}
              />
            ))}
          </ul>
          <div ref={listEnd} />
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-6 py-4">
          <button
            type="button"
            onClick={addView}
            disabled={attaching || views.length >= maxDesignViews}
            title={views.length >= maxDesignViews ? copy.designPreviewViewLimit : undefined}
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5 text-gray-500" strokeWidth={2} aria-hidden="true" />
            {copy.addAnotherView}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={attaching}
              className="rounded-md px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:text-gray-900 disabled:opacity-40"
            >
              {copy.cancel}
            </button>
            <button
              type="button"
              onClick={() => void attach()}
              disabled={attaching || views.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3.5 py-2 text-xs font-semibold whitespace-nowrap text-white shadow-sm transition-colors hover:bg-gray-800 disabled:opacity-40"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
              {attaching ? copy.attachingDesignPreview : copy.attachDesignPreviewAction}
            </button>
          </div>
          {error ? <p className="basis-full text-xs text-red-600">{error}</p> : null}
        </footer>
      </div>
    </div>
  );
}
