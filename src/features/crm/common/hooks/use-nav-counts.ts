"use client";

import { useEffect, useState } from "react";
import { navCountsSchema, type NavCounts } from "@/src/features/crm/common/types";

const refreshDelayMs = 300;

const listeners = new Set<(counts: NavCounts) => void>();
let shared: NavCounts | undefined;
let subscribers = 0;
let source: EventSource | undefined;
let timer: number | undefined;

async function refresh() {
  const response = await fetch("/api/crm/nav-counts");
  if (!response.ok) return;
  const parsed = navCountsSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) return;
  shared = parsed.data;
  for (const listener of listeners) listener(parsed.data);
}

function schedule() {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    void refresh();
  }, refreshDelayMs);
}

function start() {
  if (source) return;
  source = new EventSource("/api/crm/conversations/events");
  source.onmessage = () => schedule();
  source.addEventListener("read", () => schedule());
}

function stop() {
  window.clearTimeout(timer);
  source?.close();
  source = undefined;
}

export function useNavCounts(initial: NavCounts): NavCounts {
  const [counts, setCounts] = useState(shared ?? initial);

  useEffect(() => {
    listeners.add(setCounts);
    subscribers += 1;
    if (shared) setCounts(shared);
    if (subscribers === 1) start();
    return () => {
      listeners.delete(setCounts);
      subscribers -= 1;
      if (subscribers === 0) stop();
    };
  }, []);

  return counts;
}
