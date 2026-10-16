"use client";

import { useEffect, useState } from "react";
import { loadNavCounts, type NavCounts } from "@/src/features/crm/common/server/actions";

const refreshDelayMs = 300;

export function useNavCounts(): NavCounts | undefined {
  const [counts, setCounts] = useState<NavCounts | undefined>(undefined);

  useEffect(() => {
    let active = true;
    let timer: number | undefined;

    function refresh() {
      void loadNavCounts().then((result) => {
        if (!active || !("success" in result)) return;
        setCounts(result.data);
      });
    }

    function schedule() {
      window.clearTimeout(timer);
      timer = window.setTimeout(refresh, refreshDelayMs);
    }

    refresh();
    const source = new EventSource("/api/crm/conversations/events");
    source.onmessage = () => schedule();
    source.addEventListener("read", () => schedule());

    return () => {
      active = false;
      window.clearTimeout(timer);
      source.close();
    };
  }, []);

  return counts;
}
