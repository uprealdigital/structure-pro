"use client";

import { useEffect } from "react";
import { appOriginFrom, isAppHost } from "@/src/features/website/utils/hosts";

/** Home-screen launches on the marketing host continue on the app host. */
export function InstalledAppRedirect() {
  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!standalone || isAppHost(window.location.host)) return;

    const target = new URL(appOriginFrom(window.location.host));
    target.pathname = window.location.pathname;
    target.search = window.location.search;
    target.hash = window.location.hash;
    window.location.replace(target.href);
  }, []);

  return null;
}
