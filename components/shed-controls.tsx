"use client";

import {
  formatShedSummary,
  ROOF_OPTIONS,
  SIDING_OPTIONS,
  SIZE_RANGES,
  type ShedConfig,
} from "@/lib/shed-config";

type ShedControlsProps = {
  config: ShedConfig;
  onChange: (next: ShedConfig) => void;
};

export function ShedControls({ config, onChange }: ShedControlsProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col border-t border-zinc-200 bg-white md:border-t-0 md:border-l">
      <div className="border-b border-zinc-200 px-5 py-4">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
          Configure
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {formatShedSummary(config)}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-5 py-5">
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Siding
          </h2>
          <div className="grid grid-cols-1 gap-2">
            {SIDING_OPTIONS.map((option) => {
              const selected = config.sidingId === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange({ ...config, sidingId: option.id })}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    selected
                      ? "border-zinc-900 bg-zinc-50"
                      : "border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  <span
                    className="h-8 w-8 shrink-0 rounded-md border border-black/10"
                    style={{ backgroundColor: option.color }}
                    aria-hidden
                  />
                  <span className="text-sm font-medium text-zinc-800">
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Roof
          </h2>
          <div className="grid grid-cols-1 gap-2">
            {ROOF_OPTIONS.map((option) => {
              const selected = config.roofId === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange({ ...config, roofId: option.id })}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    selected
                      ? "border-zinc-900 bg-zinc-50"
                      : "border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  <span
                    className="h-8 w-8 shrink-0 rounded-md border border-black/10"
                    style={{ backgroundColor: option.color }}
                    aria-hidden
                  />
                  <span className="text-sm font-medium text-zinc-800">
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Size
          </h2>
          <SizeSlider
            label="Width"
            value={config.width}
            min={SIZE_RANGES.width.min}
            max={SIZE_RANGES.width.max}
            step={SIZE_RANGES.width.step}
            onChange={(width) => onChange({ ...config, width })}
          />
          <SizeSlider
            label="Length"
            value={config.length}
            min={SIZE_RANGES.length.min}
            max={SIZE_RANGES.length.max}
            step={SIZE_RANGES.length.step}
            onChange={(length) => onChange({ ...config, length })}
          />
          <SizeSlider
            label="Wall height"
            value={config.height}
            min={SIZE_RANGES.height.min}
            max={SIZE_RANGES.height.max}
            step={SIZE_RANGES.height.step}
            onChange={(height) => onChange({ ...config, height })}
          />
        </section>
      </div>
    </aside>
  );
}

function SizeSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium text-zinc-800">{label}</span>
        <span className="text-sm tabular-nums text-zinc-500">{value} ft</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-zinc-900"
      />
    </label>
  );
}
