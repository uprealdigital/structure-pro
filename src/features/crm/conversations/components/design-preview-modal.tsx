"use client";

import dynamic from "next/dynamic";
import { Check, Plus, RotateCw, Sparkles, Undo2, X } from "lucide-react";
import { useEffect, useRef, useState, type Ref } from "react";
import { Toast } from "@/src/common/components/toast";
import type { DesignAngle, DesignAngleView } from "@/src/features/cpq/components/building-view";
import type { QuoteSelections } from "@/src/features/cpq/types";
import { toBuildingConfig } from "@/src/features/cpq/utils/mappers";
import { UploadProgress } from "@/src/features/crm/conversations/components/composer-attachments";
import { RevisionChangeList } from "@/src/features/crm/conversations/components/revision-change-list";
import { useDesignPreviewBeautify } from "@/src/features/crm/conversations/hooks/use-design-preview-beautify";
import { copy } from "@/src/features/crm/conversations/locales/en";
import { reportCrmIssue } from "@/src/features/crm/common/server/actions";
import type { ConversationQuoteRevision } from "@/src/features/crm/conversations/types";
import type { ConfigChanges } from "@/src/features/crm/quotes/types";

const BuildingViews = dynamic(() => import("@/src/features/cpq/components/building-view"), {
  ssr: false,
});

const maxDesignViews = 4;
const defaultAngles: DesignAngle[] = ["left", "right", "top", "front"];

const angleLabel: Record<DesignAngle, string> = {
  left: copy.designAngleLeft,
  right: copy.designAngleRight,
  top: copy.designAngleTop,
  front: copy.designAngleFront,
  quarter: copy.designAngleQuarter,
};

type DesignView = {
  id: string;
  angle: DesignAngle;
};

type DesignPreviewModalProps = {
  current: ConversationQuoteRevision;
  revisions: ConversationQuoteRevision[];
  selections?: QuoteSelections | null;
  suggested?: ConfigChanges | null;
  onClose: () => void;
  onAttach: (file: File) => void | Promise<void>;
};

function createView(angle: DesignAngle): DesignView {
  return { id: crypto.randomUUID(), angle };
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
  context.fillStyle = "#ffffff";
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
  label,
  track,
  placement,
  removable,
  modelReady,
  imageUrl,
  busy,
  onRemove,
}: {
  label: string;
  track: DesignAngleView["track"];
  placement: "cell" | "full" | "center";
  removable: boolean;
  modelReady: boolean;
  imageUrl?: string;
  busy: boolean;
  onRemove: () => void;
}) {
  const waitsForModel = useRef(!modelReady);
  const [filled, setFilled] = useState(false);
  const placementClass =
    placement === "full"
      ? "col-span-2 aspect-[4/3]"
      : placement === "center"
        ? "col-span-2 aspect-[4/3] w-[calc(50%-0.375rem)] justify-self-center"
        : "aspect-[4/3]";

  return (
    <li
      ref={track as Ref<HTMLLIElement>}
      aria-label={label}
      className={`relative z-10 overflow-hidden rounded-xl border border-gray-200 bg-transparent ${placementClass}`}
      onWheel={(event) => event.stopPropagation()}
    >
      {waitsForModel.current && !filled ? (
        <div className="absolute inset-0 z-10 bg-white" onPointerDownCapture={(event) => event.stopPropagation()}>
          <UploadProgress progress={modelReady ? 100 : 0} speed={2} label={copy.designViewLoading} onFilled={() => setFilled(true)} />
        </div>
      ) : null}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={label}
          draggable={false}
          className="absolute inset-0 z-10 h-full w-full bg-white object-contain"
          onPointerDown={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        />
      ) : null}
      {busy ? (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-white/70"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <span className="text-[11px] font-medium text-gray-600">{copy.beautifying}</span>
        </div>
      ) : null}
      {removable ? (
        <button
          type="button"
          aria-label={copy.removeDesignView}
          onPointerDownCapture={(event) => event.stopPropagation()}
          onClick={onRemove}
          className="absolute top-2.5 left-2.5 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-800"
        >
          <X className="h-3 w-3" strokeWidth={2.2} aria-hidden="true" />
        </button>
      ) : null}
    </li>
  );
}

export function DesignPreviewModal({ current, revisions, selections, suggested, onClose, onAttach }: DesignPreviewModalProps) {
  const [views, setViews] = useState<DesignView[]>(() => [createView("quarter")]);
  const [modelReady, setModelReady] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [error, setError] = useState<{ id: number; message: string } | null>(null);
  const beautified = useDesignPreviewBeautify();
  const showingPhotos = beautified.shots !== null;
  const locked = attaching || beautified.beautifying || showingPhotos;
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRefs = useRef(new Map<string, DesignAngleView["track"]>());
  const captureRefs = useRef(new Map<string, DesignAngleView["captureRef"]>());
  const viewCount = useRef(views.length);
  const listEnd = useRef<HTMLDivElement>(null);
  const config = toBuildingConfig(selections ?? current.selections);
  const angleViews: DesignAngleView[] = views.map((view) => {
    let track = trackRefs.current.get(view.id);
    if (!track) {
      track = { current: null };
      trackRefs.current.set(view.id, track);
    }
    let captureRef = captureRefs.current.get(view.id);
    if (!captureRef) {
      captureRef = { current: null };
      captureRefs.current.set(view.id, captureRef);
    }
    return { id: view.id, angle: view.angle, label: angleLabel[view.angle], track, captureRef };
  });

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !attaching && !beautified.beautifying) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [attaching, beautified.beautifying, onClose]);

  useEffect(() => {
    if (views.length > viewCount.current) listEnd.current?.scrollIntoView({ block: "nearest" });
    viewCount.current = views.length;
  }, [views.length]);

  function addView() {
    if (locked || views.length >= maxDesignViews) return;
    const angle = defaultAngles[views.length % defaultAngles.length];
    setViews((currentViews) => [...currentViews, createView(angle)]);
  }

  function removeView(id: string) {
    setViews((currentViews) => (currentViews.length <= 1 ? currentViews : currentViews.filter((view) => view.id !== id)));
  }

  async function attach() {
    if (attaching || beautified.beautifying || views.length === 0) return;
    setAttaching(true);
    setError(null);
    try {
      const blobs: Blob[] = [];
      if (beautified.shots) {
        for (const view of views) {
          const shot = beautified.shots[view.id];
          if (!shot) throw new Error(copy.beautifyFailed);
          blobs.push(shot.blob);
        }
      } else {
        for (const view of views) {
          const capture = captureRefs.current.get(view.id)?.current;
          if (!capture) throw new Error(copy.designPreviewViewsLoading);
          blobs.push(await capture());
        }
      }
      await onAttach(await composeDesignPreview(blobs));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : copy.designPreviewAttachFailed;
      void reportCrmIssue("conversations", message);
      setError({
        id: Date.now(),
        message,
      });
      setAttaching(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={() => {
        if (!attaching && !beautified.beautifying) onClose();
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
            disabled={attaching || beautified.beautifying}
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-4">
          <RevisionChangeList current={current} revisions={revisions} suggested={suggested} />

          <div className="mt-6 mb-3 flex items-center justify-between gap-3">
            <h3 className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">{copy.designPreviewAngles}</h3>
            {showingPhotos || beautified.beautifying ? null : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-400">
                <RotateCw className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                {copy.designPreviewRotate}
              </span>
            )}
          </div>
          <div ref={stageRef} className="relative">
            <BuildingViews
              config={config}
              views={angleViews}
              stageRef={stageRef}
              interactive={!showingPhotos && !beautified.beautifying}
              onReady={() => setModelReady(true)}
            />
            <ul className="relative z-10 grid grid-cols-2 gap-3">
              {angleViews.map((view, index) => (
                <DesignAngleCard
                  key={view.id}
                  label={view.label}
                  track={view.track}
                  placement={views.length === 1 ? "full" : views.length === 3 && index === 2 ? "center" : "cell"}
                  removable={views.length > 1 && !locked}
                  modelReady={modelReady}
                  imageUrl={beautified.shots?.[view.id]?.url}
                  busy={beautified.beautifying}
                  onRemove={() => removeView(view.id)}
                />
              ))}
            </ul>
          </div>
          <div ref={listEnd} />
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={addView}
              disabled={locked || views.length >= maxDesignViews}
              title={views.length >= maxDesignViews ? copy.designPreviewViewLimit : undefined}
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5 text-gray-500" strokeWidth={2} aria-hidden="true" />
              {copy.addAnotherView}
            </button>
            <button
              type="button"
              onClick={() => {
                if (showingPhotos) {
                  beautified.revert();
                  return;
                }
                const captures = views.flatMap((view) => {
                  const capture = captureRefs.current.get(view.id)?.current;
                  return capture ? [{ id: view.id, capture }] : [];
                });
                if (captures.length !== views.length) {
                  setError({ id: Date.now(), message: copy.designPreviewViewsLoading });
                  return;
                }
                void beautified.beautify(captures);
              }}
              disabled={beautified.beautifying || attaching || !modelReady || views.length === 0}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40"
            >
              {showingPhotos ? (
                <Undo2 className="h-3.5 w-3.5 text-gray-500" strokeWidth={2} aria-hidden="true" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-gray-500" strokeWidth={2} aria-hidden="true" />
              )}
              {beautified.beautifying ? copy.beautifying : showingPhotos ? copy.revertBeautify : copy.beautify}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={attaching || beautified.beautifying}
              className="rounded-md px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:text-gray-900 disabled:opacity-40"
            >
              {copy.cancel}
            </button>
            <button
              type="button"
              onClick={() => void attach()}
              disabled={attaching || beautified.beautifying || views.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3.5 py-2 text-xs font-semibold whitespace-nowrap text-white shadow-sm transition-colors hover:bg-gray-800 disabled:opacity-40"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
              {attaching ? copy.attachingDesignPreview : copy.attachDesignPreviewAction}
            </button>
          </div>
        </footer>
        {error ?? beautified.error ? (
          <Toast
            key={(error ?? beautified.error)?.id}
            message={(error ?? beautified.error)?.message ?? ""}
            tone="error"
            dismissLabel={copy.dismiss}
            onDismiss={() => {
              setError(null);
              beautified.setError(null);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
