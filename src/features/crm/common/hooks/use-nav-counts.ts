"use client";

import { useEffect, useState } from "react";
import { loadNavCounts, type NavCounts } from "@/src/features/crm/common/server/actions";

export function useNavCounts(): NavCounts | undefined {
  const [counts, setCounts] = useState<NavCounts | undefined>(undefined);

  useEffect(() => {
    let active = true;

    loadNavCounts().then((result) => {
      if (!active || !("success" in result)) return;
      setCounts(result.data);
    });

    return () => {
      active = false;
    };
  }, []);

  return counts;
}
