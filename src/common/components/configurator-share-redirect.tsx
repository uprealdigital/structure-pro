"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { CONFIGURATION_ID } from "@/src/features/cpq/types";

export function ConfiguratorShareRedirect() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/cpq") return;
    const id = window.location.hash.replace(/^#/, "");
    if (!CONFIGURATION_ID.test(id)) return;
    const search = window.location.search;
    window.location.replace(`/cpq${search}#${id}`);
  }, [pathname]);

  return null;
}
