"use client";

import { useEffect, useRef, useState } from "react";
import { reportCrmIssue } from "@/src/features/crm/common/server/actions";
import { copy } from "@/src/features/crm/conversations/locales/en";

export type BeautifiedShot = {
  url: string;
  blob: Blob;
};

const REQUEST_MS = 55_000;

export function useDesignPreviewBeautify() {
  const [shots, setShots] = useState<Record<string, BeautifiedShot> | null>(null);
  const [beautifying, setBeautifying] = useState(false);
  const [error, setError] = useState<{ id: number; message: string } | null>(null);
  const alive = useRef(true);
  const running = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const urls = useRef<string[]>([]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      abortRef.current?.abort();
      for (const url of urls.current) URL.revokeObjectURL(url);
      urls.current = [];
    };
  }, []);

  function remember(next: Record<string, BeautifiedShot> | null) {
    for (const url of urls.current) URL.revokeObjectURL(url);
    urls.current = next ? Object.values(next).map((shot) => shot.url) : [];
    setShots(next);
  }

  function revert() {
    if (beautifying) return;
    remember(null);
    setError(null);
  }

  async function beautify(captures: { id: string; capture: () => Promise<Blob> }[]) {
    if (running.current || shots || captures.length === 0) return;
    running.current = true;
    const controller = new AbortController();
    abortRef.current = controller;
    const timer = window.setTimeout(() => controller.abort(), REQUEST_MS);
    setBeautifying(true);
    setError(null);
    try {
      const pending = captures.map((item) => ({ id: item.id, blob: item.capture() }));
      const sources = await Promise.all(pending.map(async (item) => ({ id: item.id, blob: await item.blob })));
      const generated = await Promise.all(
        sources.map(async (source) => {
          const form = new FormData();
          form.append("render", new File([source.blob], "render.png", { type: source.blob.type || "image/png" }));
          const response = await fetch("/api/ai/render", { method: "POST", body: form, signal: controller.signal });
          if (!response.ok) throw new Error(copy.beautifyFailed);
          const type = response.headers.get("content-type") ?? "";
          if (!type.startsWith("image/")) throw new Error(copy.beautifyFailed);
          const blob = await response.blob();
          if (blob.size === 0) throw new Error(copy.beautifyFailed);
          return { id: source.id, blob };
        }),
      );
      if (!alive.current) return;
      const next: Record<string, BeautifiedShot> = {};
      for (const shot of generated) {
        next[shot.id] = { blob: shot.blob, url: URL.createObjectURL(shot.blob) };
      }
      remember(next);
    } catch (caught) {
      if (!alive.current) return;
      const message = copy.beautifyFailed;
      void reportCrmIssue("conversations", caught instanceof Error ? caught.message : message);
      setError({ id: Date.now(), message });
    } finally {
      window.clearTimeout(timer);
      running.current = false;
      if (abortRef.current === controller) abortRef.current = null;
      if (alive.current) setBeautifying(false);
    }
  }

  return { shots, beautifying, error, setError, beautify, revert };
}
