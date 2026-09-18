"use client";

import { Check } from "lucide-react";

type ColorSwatchProps = {
  label: string;
  hex: string;
  selected: boolean;
  onSelect: () => void;
};

export function ColorSwatch({ label, hex, selected, onSelect }: ColorSwatchProps) {
  return (
    <button
      className="group flex flex-col items-center focus:outline-none"
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
    >
      <div className="relative h-14 w-14">
        <div
          className={`h-full w-full rounded-full shadow-xs ${
            selected
              ? "border-2 border-black ring-2 ring-black/20"
              : "border border-gray-200"
          }`}
          style={{ backgroundColor: hex }}
        />
        {selected ? (
          <div className="absolute right-0 bottom-0 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-black text-white shadow">
            <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
          </div>
        ) : null}
      </div>
      <span
        className={`mt-1.5 text-center text-[11px] leading-tight ${
          selected ? "font-semibold text-gray-900" : "font-medium text-gray-700"
        }`}
      >
        {label}
      </span>
    </button>
  );
}
