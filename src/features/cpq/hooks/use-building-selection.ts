"use client";

import { useEffect, useMemo, useState } from "react";
import { copy } from "@/src/features/cpq/locales/en";
import {
  getConfigurationAction,
  saveConfigAction,
} from "@/src/features/cpq/server/actions";
import {
  configurationIdSchema,
  localeCodeSchema,
  type QuoteSelections,
} from "@/src/features/cpq/types";
import { applyAssistantPrompt } from "@/src/features/cpq/utils/assistant";
import {
  DEFAULT_LNG,
  DEFAULT_BUILDING_CONFIG,
  DEFAULT_ZIP,
  getStyle,
  type BuildingConfig,
} from "@/src/features/cpq/utils/catalog";
import { configurationShareUrl } from "@/src/features/cpq/utils/formatting";
import { estimateBuilding } from "@/src/features/cpq/utils/pricing";

export function useBuildingSelection() {
  const [config, setConfig] = useState<BuildingConfig>(DEFAULT_BUILDING_CONFIG);
  const [assistantNote, setAssistantNote] = useState("");
  const [assistantNoteId, setAssistantNoteId] = useState(0);
  const [zip, setZip] = useState(DEFAULT_ZIP);
  const [lng, setLng] = useState(DEFAULT_LNG);
  const [configReady, setConfigReady] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState<"saving" | "copied" | "error">("saving");
  const [shareUrl, setShareUrl] = useState("");
  const [shareError, setShareError] = useState("");
  const selections = useMemo<QuoteSelections>(
    () => ({ ...config, zip }),
    [config, zip],
  );
  const style = getStyle(config.styleId);
  const estimate = useMemo(() => estimateBuilding(config), [config]);

  useEffect(() => {
    let cancelled = false;

    async function loadSharedConfiguration() {
      const params = new URLSearchParams(window.location.search);
      const queryZip = params.get("zip")?.trim() ?? "";
      const queryLng = params.get("lng")?.trim() ?? "";
      const hash = window.location.hash.replace(/^#/, "");
      const shareId = configurationIdSchema.safeParse(hash).success ? hash : "";

      if (queryZip) setZip(queryZip);
      if (localeCodeSchema.safeParse(queryLng).success) setLng(queryLng);

      if (!shareId) {
        if (!cancelled) setConfigReady(true);
        return;
      }

      try {
        const stored = await getConfigurationAction(shareId);
        if (cancelled || !stored) return;
        const { lng: savedLng, zip: savedZip, ...building } = stored;
        setConfig(building);
        if (!queryZip) setZip(savedZip);
        if (!localeCodeSchema.safeParse(queryLng).success) setLng(savedLng);
      } catch {
        // An unknown id falls back to default-config.json, already in state.
      } finally {
        if (!cancelled) setConfigReady(true);
      }
    }

    void loadSharedConfiguration();
    return () => {
      cancelled = true;
    };
  }, []);

  async function shareConfiguration() {
    setShareOpen(true);
    setShareStatus("saving");
    setShareUrl("");
    setShareError("");

    try {
      const result = await saveConfigAction({ selections: { lng, ...selections } });
      if ("error" in result) throw new Error(result.error);

      const href = configurationShareUrl(window.location.href, result.data.id);
      const url = new URL(href);
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      setShareUrl(href);
      await navigator.clipboard.writeText(href);
      setShareStatus("copied");
    } catch (error) {
      setShareStatus("error");
      setShareError(error instanceof Error ? error.message : copy.shareError);
    }
  }

  function submitPrompt(prompt: string) {
    const result = applyAssistantPrompt(config, prompt);
    setConfig(result.config);
    setAssistantNote(result.message);
    setAssistantNoteId((id) => id + 1);
  }

  return {
    assistantNote,
    assistantNoteId,
    config,
    configReady,
    estimate,
    selections,
    setConfig,
    setShareOpen,
    shareConfiguration,
    shareError,
    shareOpen,
    shareStatus,
    shareUrl,
    style,
    submitPrompt,
    zip,
  };
}
