"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { copy } from "@/src/i18n/en";
import { ColorSwatch } from "@/src/components/ui/color-swatch";
import {
  CATALOG,
  getColor,
  type ShedConfig,
} from "@/src/config/shed-config";

type ShedControlsProps = {
  config: ShedConfig;
  onChange: (next: ShedConfig) => void;
  onSubmit: () => void;
};

export function ShedControls({ config, onChange, onSubmit }: ShedControlsProps) {
  const sidingColor = getColor(config.sidingColorId);
  const trimColor = getColor(config.trimColorId);
  const roofColor = getColor(config.roofColorId);
  const shutterColor = getColor(config.shutterColorId);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 divide-y divide-[#E5E7EB] overflow-y-auto">
        <Accordion title={copy.style} defaultOpen>
          <div className="grid grid-cols-3 gap-2.5">
            {CATALOG.styles.map((style) => {
              const selected = config.styleId === style.id;
              return (
                <button
                  key={style.id}
                  className="group flex w-full flex-col items-center text-left focus:outline-none"
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange({ ...config, styleId: style.id })}
                >
                  <div
                    className={`relative aspect-[4/3] w-full overflow-hidden rounded-md bg-[#f3f4f6] p-1 ${
                      selected ? "border-2 border-black" : "border border-gray-200"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={style.label}
                      src={style.image}
                      className="h-full w-full object-contain"
                    />
                    {selected ? <SelectedMark /> : null}
                  </div>
                  <span className="mt-1.5 text-center text-xs leading-tight font-semibold text-gray-950">
                    {style.label}
                  </span>
                </button>
              );
            })}
          </div>
        </Accordion>

        <Accordion title={copy.size}>
          <div className="grid grid-cols-2 gap-2.5">
            {CATALOG.sizes.map((size) => {
              const selected =
                config.width === size.width && config.length === size.length;
              return (
                <button
                  key={`${size.width}x${size.length}`}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    onChange({
                      ...config,
                      width: size.width,
                      length: size.length,
                    })
                  }
                  className={`relative px-3 py-2 text-left text-xs font-medium transition-all ${
                    selected
                      ? "rounded-sm border-2 border-black bg-gray-50"
                      : "rounded-sm border border-gray-300 hover:border-black"
                  }`}
                >
                  <span className="font-semibold text-gray-900">
                    {size.width} × {size.length} ft
                  </span>
                  {selected ? <SelectedMark /> : null}
                </button>
              );
            })}
          </div>
        </Accordion>

        <Accordion title={copy.material}>
          <div className="space-y-5">
            <div className="space-y-3">
              <h3 className="font-serif text-sm font-semibold text-gray-900">
                {copy.sidingTrim}
              </h3>
              <div className="flex items-center gap-6">
                {CATALOG.sidingTypes.map((option) => (
                  <TextureSwatch
                    key={option.id}
                    label={option.label}
                    image={option.image}
                    selected={config.sidingTypeId === option.id}
                    onSelect={() =>
                      onChange({ ...config, sidingTypeId: option.id })
                    }
                  />
                ))}
              </div>
            </div>
            <div className="space-y-3 pt-2">
              <h3 className="font-serif text-sm font-semibold text-gray-900">
                {copy.roof}
              </h3>
              <div className="flex items-center gap-6">
                {CATALOG.roofTypes.map((option) => (
                  <TextureSwatch
                    key={option.id}
                    label={option.label}
                    image={option.image}
                    selected={config.roofTypeId === option.id}
                    onSelect={() =>
                      onChange({ ...config, roofTypeId: option.id })
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </Accordion>

        <Accordion title={copy.colors}>
          <ColorSection
            title={copy.sidingColor}
            selectedLabel={sidingColor.label}
            selectedId={config.sidingColorId}
            onSelect={(sidingColorId) => onChange({ ...config, sidingColorId })}
          />
          <ColorSection
            title={copy.trimColor}
            selectedLabel={trimColor.label}
            selectedId={config.trimColorId}
            onSelect={(trimColorId) => onChange({ ...config, trimColorId })}
          />
          <ColorSection
            title={copy.roofColor}
            selectedLabel={roofColor.label}
            selectedId={config.roofColorId}
            extraIds={["coffee-brown"]}
            onSelect={(roofColorId) => onChange({ ...config, roofColorId })}
          />
          <ColorSection
            title={copy.shutterColor}
            selectedLabel={shutterColor.label}
            selectedId={config.shutterColorId}
            onSelect={(shutterColorId) =>
              onChange({ ...config, shutterColorId })
            }
          />
        </Accordion>

        <Accordion title={copy.doorsWindows}>
          <p className="text-xs leading-relaxed text-gray-500">{copy.doorsHint}</p>
          <div className="flex items-center space-x-2 border-b border-gray-100 pt-1 pb-3">
            {(["front", "left", "back", "right"] as const).map((face) => (
              <button
                key={face}
                type="button"
                onClick={() => onChange({ ...config, wallFace: face })}
                className={`rounded-full px-4 py-1.5 text-xs font-medium ${
                  config.wallFace === face
                    ? "bg-stone-900 text-white"
                    : "border border-gray-200 bg-white text-gray-700"
                }`}
              >
                {copy[face]}
              </button>
            ))}
          </div>
          <h4 className="mt-3 mb-3 text-xs font-semibold text-gray-800">
            {copy.addItems}
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <OpeningTile
              label={copy.door}
              active={config.doorStyle === "single"}
              onClick={() =>
                onChange({
                  ...config,
                  doorStyle: config.doorStyle === "single" ? "none" : "single",
                })
              }
            />
            <OpeningTile
              label={copy.doubleDoor}
              active={config.doorStyle === "double"}
              onClick={() =>
                onChange({
                  ...config,
                  doorStyle: config.doorStyle === "double" ? "none" : "double",
                })
              }
            />
            <OpeningTile
              label={copy.window}
              active={config.hasWindow}
              onClick={() =>
                onChange({ ...config, hasWindow: !config.hasWindow })
              }
            />
            <OpeningTile label={copy.transom} active={false} onClick={() => undefined} />
            <OpeningTile label={copy.rollup} active={false} onClick={() => undefined} />
            <OpeningTile label={copy.vent} active={false} onClick={() => undefined} />
          </div>
          <div className="mt-3 border-t border-gray-100 pt-3">
            <h4 className="mb-2 text-xs font-semibold text-gray-800">
              {copy.arrange}
            </h4>
            <button
              type="button"
              onClick={() =>
                onChange({ ...config, doorStyle: "none", hasWindow: false })
              }
              className="flex w-full items-center justify-center rounded-full border border-gray-300 py-2 text-xs font-medium text-gray-600"
            >
              {copy.clear}
            </button>
          </div>
        </Accordion>

        <Accordion title={copy.interior}>
          <p className="text-xs leading-relaxed text-gray-500">
            {copy.interiorHint}
          </p>
          <div className="text-xs text-gray-600">
            <span className="font-semibold text-gray-800">{copy.loftLabel}</span>{" "}
            {copy.loftOption}
          </div>
          <label className="flex cursor-pointer items-center space-x-2.5">
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                config.hasLoft ? "border-amber-500" : "border-gray-400"
              }`}
            >
              {config.hasLoft ? (
                <span className="h-2 w-2 rounded-full bg-amber-500" />
              ) : null}
            </span>
            <button
              type="button"
              className="text-xs font-medium text-gray-800"
              onClick={() => onChange({ ...config, hasLoft: !config.hasLoft })}
            >
              {copy.loftOption}
            </button>
          </label>
        </Accordion>

        <Accordion title={copy.flooring}>
          <p className="border-b border-gray-200 pb-3 text-xs leading-relaxed text-gray-500">
            {copy.flooringHint}
          </p>
          <div className="space-y-3 pt-3">
            {CATALOG.flooring.map((option) => (
              <button
                key={option.id}
                type="button"
                className="flex items-center space-x-3 text-left"
                onClick={() => onChange({ ...config, flooringId: option.id })}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                    config.flooringId === option.id
                      ? "border-amber-500"
                      : "border-gray-400"
                  }`}
                >
                  {config.flooringId === option.id ? (
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                  ) : null}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </Accordion>
      </div>
      <button type="button" className="sr-only" onClick={onSubmit}>
        {copy.submitQuote}
      </button>
    </div>
  );
}

function Accordion({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="select-none">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between p-6 hover:bg-gray-50/70"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="font-serif text-base font-semibold tracking-normal text-gray-900">
          {title}
        </span>
        <ChevronDown
          className={`h-5 w-5 text-gray-600 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? <div className="space-y-6 px-6 pt-1 pb-6">{children}</div> : null}
    </div>
  );
}

function SelectedMark() {
  return (
    <span className="absolute right-1.5 bottom-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-black text-white shadow-sm">
      <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
    </span>
  );
}

function TextureSwatch({
  label,
  image,
  selected,
  onSelect,
}: {
  label: string;
  image: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className="group flex flex-col items-center focus:outline-none"
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
    >
      <div className="relative h-14 w-14">
        <div
          className={`h-full w-full overflow-hidden rounded-full bg-stone-100 ${
            selected ? "border-2 border-black" : "border border-gray-200"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt={label} src={image} className="h-full w-full object-cover" />
        </div>
        {selected ? (
          <div className="absolute right-0 bottom-0 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-black text-white shadow">
            <Check className="h-2.5 w-2.5" strokeWidth={3} />
          </div>
        ) : null}
      </div>
      <span className="mt-1.5 max-w-20 text-center text-xs leading-tight font-semibold text-gray-800">
        {label}
      </span>
    </button>
  );
}

function ColorSection({
  title,
  selectedLabel,
  selectedId,
  onSelect,
  extraIds = [],
}: {
  title: string;
  selectedLabel: string;
  selectedId: string;
  onSelect: (id: string) => void;
  extraIds?: string[];
}) {
  const colors = CATALOG.colors.filter(
    (color) => color.id !== "coffee-brown" || extraIds.includes(color.id),
  );
  const ordered = extraIds.length
    ? [
        ...colors.filter((color) => extraIds.includes(color.id)),
        ...colors.filter((color) => !extraIds.includes(color.id)),
      ]
    : colors;

  return (
    <div className="space-y-3 border-t border-gray-100 pt-3 first:border-t-0 first:pt-0">
      <div className="flex items-baseline space-x-2">
        <h3 className="font-serif text-sm font-semibold text-gray-900">{title}</h3>
        <span className="text-xs font-normal text-gray-500">| {selectedLabel}</span>
      </div>
      <div className="grid grid-cols-4 gap-x-2 gap-y-4 pt-1">
        {ordered.map((color) => (
          <ColorSwatch
            key={color.id}
            label={color.label}
            hex={color.hex}
            selected={selectedId === color.id}
            onSelect={() => onSelect(color.id)}
          />
        ))}
      </div>
    </div>
  );
}

function OpeningTile({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex h-24 flex-col items-center justify-center rounded-xl border bg-gray-50 p-2.5 ${
        active ? "border-black" : "border-gray-200"
      }`}
    >
      <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full border border-amber-600/80 text-amber-700">
        +
      </span>
      <span className="text-center text-[11px] font-medium text-gray-700">
        {label}
      </span>
    </button>
  );
}
