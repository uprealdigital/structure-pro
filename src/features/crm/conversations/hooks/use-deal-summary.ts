"use client";

import { useEffect, useRef, useState } from "react";
import type { DealSummaryRequest } from "@/src/features/ai/types";
import { summarizeConversationDeal } from "@/src/features/crm/conversations/server/actions";

const saved = new Map<string, { fingerprint: string; summary: string }>();
const inflight = new Map<string, Promise<{ success: true; data: string } | { error: string }>>();

function loadSummary(dealId: string, fingerprint: string, request: DealSummaryRequest) {
  const key = `${dealId}:${fingerprint}`;
  const current = inflight.get(key);
  if (current) return current;
  const requestPromise = summarizeConversationDeal(request).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, requestPromise);
  return requestPromise;
}

export function useDealSummary(
  dealId: string,
  enabled: boolean,
  request: DealSummaryRequest,
  fingerprint: string,
): string {
  const cached = saved.get(dealId);
  const [trackedDealId, setTrackedDealId] = useState(dealId);
  const [summary, setSummary] = useState(cached?.fingerprint === fingerprint ? cached.summary : "");
  const requestRef = useRef(request);
  requestRef.current = request;
  const latest = useRef(fingerprint);

  if (trackedDealId !== dealId) {
    const next = saved.get(dealId);
    setTrackedDealId(dealId);
    setSummary(next?.fingerprint === fingerprint ? next.summary : "");
  }

  useEffect(() => {
    if (!enabled) return;
    const stored = saved.get(dealId);
    if (stored?.fingerprint === fingerprint) {
      setSummary(stored.summary);
      return;
    }
    latest.current = fingerprint;
    let cancelled = false;
    void loadSummary(dealId, fingerprint, requestRef.current).then((result) => {
      if ("error" in result || !result.data || latest.current !== fingerprint) return;
      saved.set(dealId, { fingerprint, summary: result.data });
      if (!cancelled) setSummary(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [dealId, enabled, fingerprint]);

  return summary;
}
