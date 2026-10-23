"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useProgress } from "@react-three/drei";
import type { BuildingCapture, QuoteRevisionRenderCapture } from "@/src/features/cpq/components/building-scene";
import type { QuoteSelections } from "@/src/features/cpq/types";
import { toBuildingConfig } from "@/src/features/cpq/utils/mappers";
import { copy } from "@/src/features/crm/conversations/locales/en";
import { saveSuggestionPreview } from "@/src/features/crm/conversations/server/actions";

const BuildingScene = dynamic(() => import("@/src/features/cpq/components/building-scene"), { ssr: false });

const RING_RADIUS = 16;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function ProposedShedRender({
  selections,
  alt,
  suggestionId,
  previewImageUrl,
  onPreviewSaved,
}: {
  selections: QuoteSelections;
  alt: string;
  suggestionId?: string;
  previewImageUrl?: string | null;
  onPreviewSaved?: (id: string, previewImageUrl: string) => void;
}) {
  const selectionKey = JSON.stringify(selections);
  const config = useMemo(() => toBuildingConfig(JSON.parse(selectionKey) as QuoteSelections), [selectionKey]);
  const renderCaptureRef = useRef<QuoteRevisionRenderCapture | null>(null);
  const captureBuildingRef = useRef<BuildingCapture | null>(null);
  const urlRef = useRef<string | null>(null);
  const pngRef = useRef<{ key: string; file: Blob } | null>(null);
  const savedKey = useRef("");
  const saveRef = useRef({ suggestionId, previewImageUrl, onPreviewSaved });
  saveRef.current = { suggestionId, previewImageUrl, onPreviewSaved };
  const meterRef = useRef(0);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [meter, setMeter] = useState(0);
  const { active, progress } = useProgress();
  const loading = useRef({ active, progress });
  loading.current = { active, progress };

  useEffect(() => {
    setUrl(null);
    setFailed(false);
    meterRef.current = 0;
    setMeter(0);
    let cancelled = false;
    let idleSince: number | null = null;
    let capturing = false;
    let pendingUrl: string | null = null;
    const started = performance.now();

    const frame = window.setInterval(() => {
      const state = loading.current;
      const elapsed = performance.now() - started;
      const paced = Math.min(90, (elapsed / 1400) * 90);
      const loaded = state.active ? 18 + state.progress * 0.6 : 0;
      const target = pendingUrl ? 100 : Math.max(paced, loaded);
      const current = meterRef.current;
      const next = current + (target - current) * (pendingUrl ? 0.45 : 0.35);
      const shown = Math.abs(target - next) < 0.6 ? target : next;
      if (shown !== current) {
        meterRef.current = shown;
        setMeter(shown);
      }
      if (pendingUrl && shown >= 99) {
        window.clearInterval(frame);
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = pendingUrl;
        pendingUrl = null;
        setUrl(urlRef.current);
      }
    }, 32);

    const timer = window.setInterval(() => {
      const capture = renderCaptureRef.current;
      const state = loading.current;
      if (!capture || state.active || capturing) {
        if (!capturing) idleSince = null;
        return;
      }
      idleSince ??= Date.now();
      if (Date.now() - idleSince < 1200) return;
      capturing = true;
      window.setTimeout(() => {
        if (cancelled) return;
        void capture()
          .then(async (files) => {
            if (cancelled) return;
            const png = await pngFile(files.small);
            if (cancelled) return;
            pngRef.current = { key: selectionKey, file: png };
            window.clearInterval(timer);
            pendingUrl = URL.createObjectURL(png);
            void persistPreview(png, selectionKey, saveRef, savedKey);
          })
          .catch(() => {
            if (cancelled) return;
            window.clearInterval(timer);
            window.clearInterval(frame);
            setFailed(true);
          });
      }, 300);
    }, 120);

    return () => {
      cancelled = true;
      window.clearInterval(frame);
      window.clearInterval(timer);
      if (pendingUrl) URL.revokeObjectURL(pendingUrl);
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [selectionKey]);

  useEffect(() => {
    if (previewImageUrl) return;
    savedKey.current = "";
    if (pngRef.current?.key === selectionKey) void persistPreview(pngRef.current.file, selectionKey, saveRef, savedKey);
  }, [previewImageUrl, selectionKey]);

  const scene =
    url || failed || typeof document === "undefined" ? null : (
      <div className="pointer-events-none fixed top-0 -left-[2000px] size-[150px]" aria-hidden="true">
        <BuildingScene config={config} captureRef={captureBuildingRef} renderCaptureRef={renderCaptureRef} />
      </div>
    );

  return (
    <>
      {url ? (
        <img alt={alt} src={url} width={150} height={150} className="h-full w-full object-contain" />
      ) : failed ? null : (
        <RenderMeter value={meter} />
      )}
      {scene ? createPortal(scene, document.body) : null}
    </>
  );
}

async function persistPreview(
  png: Blob,
  selectionKey: string,
  saveRef: {
    current: {
      suggestionId?: string;
      previewImageUrl?: string | null;
      onPreviewSaved?: (id: string, previewImageUrl: string) => void;
    };
  },
  savedKey: { current: string },
) {
  const save = saveRef.current;
  if (!save.suggestionId || save.previewImageUrl) return;
  const key = `${save.suggestionId}:${selectionKey}`;
  if (savedKey.current === key) return;
  savedKey.current = key;
  const suggestionId = save.suggestionId;
  const body = new FormData();
  body.set("id", suggestionId);
  body.set("file", png, "preview.png");
  const result = await saveSuggestionPreview(body);
  if (savedKey.current !== key) return;
  if ("error" in result) {
    savedKey.current = "";
    return;
  }
  const latest = saveRef.current;
  if (latest.suggestionId !== suggestionId || latest.previewImageUrl) return;
  latest.onPreviewSaved?.(suggestionId, result.data.previewImageUrl);
}

async function pngFile(source: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Could not save the preview");
  }
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!png) throw new Error("Could not save the preview");
  return png;
}

function RenderMeter({ value }: { value: number }) {
  const shown = Math.min(100, Math.max(0, value));
  const offset = RING_CIRCUMFERENCE - (shown / 100) * RING_CIRCUMFERENCE;
  return (
    <div
      className="flex h-full w-full items-center justify-center bg-white"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(shown)}
      aria-label={copy.renderingSuggestion(Math.round(shown))}
    >
      <svg className="h-12 w-12 -rotate-90" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r={RING_RADIUS} fill="none" stroke="#121314" strokeOpacity="0.16" strokeWidth="3.25" />
        <circle
          cx="20"
          cy="20"
          r={RING_RADIUS}
          fill="none"
          stroke="#121314"
          strokeWidth="3.25"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
      </svg>
    </div>
  );
}
