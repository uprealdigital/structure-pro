"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ShedControls } from "@/components/shed-controls";
import { DEFAULT_SHED_CONFIG } from "@/lib/shed-config";

const ShedScene = dynamic(() => import("@/components/shed-scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#e8ece8] text-sm text-zinc-500">
      Loading 3D view…
    </div>
  ),
});

export function ShedConfigurator() {
  const [config, setConfig] = useState(DEFAULT_SHED_CONFIG);

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <div className="relative min-h-[50vh] flex-1 md:min-h-0">
        <ShedScene config={config} />
      </div>
      <div className="h-[46vh] w-full shrink-0 md:h-auto md:w-[35%] md:max-w-md">
        <ShedControls config={config} onChange={setConfig} />
      </div>
    </div>
  );
}
