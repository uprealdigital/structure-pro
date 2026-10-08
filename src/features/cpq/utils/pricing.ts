import priceSheet from "@/src/features/cpq/config/pricing.json";
import {
  CATALOG,
  getColor,
  getFlooring,
  getRoofType,
  getSidingType,
  getStyle,
  type BuildingConfig,
} from "@/src/features/cpq/utils/catalog";
import { toBuildingConfig } from "@/src/features/cpq/utils/mappers";
import type { QuoteSelections, QuoteSummary } from "@/src/features/cpq/types";

export type PriceUnit = "fixed" | "perSqFt";

export type PriceAmount = {
  unit: PriceUnit;
  amount: number;
};

export type SizePrice = {
  cash: number;
  rto: number;
};

export type PriceSheet = {
  rtoMonths: number;
  styles: Record<string, Record<string, SizePrice>>;
  options: Record<string, PriceAmount>;
};

export type EstimateLine = {
  label: string;
  amount: number;
};

export type BuildingEstimate = {
  total: number;
  rto: number;
  rtoMonths: number;
  lines: EstimateLine[];
};

export const PRICE_SHEET = priceSheet as PriceSheet;

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function sizeKey(width: number, length: number): string {
  return `${width}x${length}`;
}

function optionCost(option: PriceAmount | undefined, area: number): number {
  if (!option) return 0;
  const raw = option.unit === "perSqFt" ? option.amount * area : option.amount;
  return Math.round(raw);
}

const DOOR_LABELS: Record<BuildingConfig["doorStyle"], string> = {
  single: "Single door",
  double: "Double door",
  none: "No door",
};

function selectedOptions(config: BuildingConfig): { id: string; label: string }[] {
  const items = [
    {
      id: `siding:${config.sidingTypeId}`,
      label: getSidingType(config.sidingTypeId).label,
    },
    {
      id: `roof:${config.roofTypeId}`,
      label: getRoofType(config.roofTypeId).label,
    },
    {
      id: `flooring:${config.flooringId}`,
      label: getFlooring(config.flooringId).label,
    },
    {
      id: `door:${config.doorStyle}`,
      label: DOOR_LABELS[config.doorStyle],
    },
    {
      id: `paint:${config.sidingColorId}`,
      label: `${getColor(config.sidingColorId).label} paint`,
    },
  ];
  if (config.hasWindow) items.push({ id: "window", label: "Window" });
  if (config.hasLoft) items.push({ id: "loft", label: "Loft" });
  if (config.hasVent) items.push({ id: "vent", label: "Vent" });
  return items;
}

export function estimateBuilding(
  config: BuildingConfig,
  prices: PriceSheet = PRICE_SHEET,
): BuildingEstimate {
  const style = getStyle(config.styleId);
  const cell = prices.styles[config.styleId]?.[
    sizeKey(config.width, config.length)
  ] ?? { cash: 0, rto: 0 };
  const area = config.width * config.length;
  const lines: EstimateLine[] = [
    {
      label: `${style.productTitle} (${config.width}×${config.length})`,
      amount: cell.cash,
    },
  ];

  let optionsTotal = 0;
  for (const option of selectedOptions(config)) {
    const amount = optionCost(prices.options[option.id], area);
    if (amount === 0) continue;
    optionsTotal += amount;
    lines.push({ label: option.label, amount });
  }

  return {
    total: cell.cash + optionsTotal,
    rto: cell.rto,
    rtoMonths: prices.rtoMonths,
    lines,
  };
}

const SELECTION_DOOR_LABELS: Record<BuildingConfig["doorStyle"], string> = {
  single: "Single door",
  double: "Double door",
  none: "None",
};

export function describeSelections(selections: QuoteSelections) {
  const style = getStyle(selections.styleId);
  const siding = getSidingType(selections.sidingTypeId);
  const roof = getRoofType(selections.roofTypeId);
  const flooring = getFlooring(selections.flooringId);
  const estimate = estimateBuilding(toBuildingConfig(selections));

  return {
    style,
    siding,
    roof,
    flooring,
    estimate,
    sidingColor: getColor(selections.sidingColorId),
    trimColor: getColor(selections.trimColorId),
    roofColor: getColor(selections.roofColorId),
    shutterColor: getColor(selections.shutterColorId),
    doorLabel: SELECTION_DOOR_LABELS[selections.doorStyle],
    brand: CATALOG.brand,
    specs: [
      { label: "Style", value: style.productTitle },
      {
        label: "Size",
        value: `${selections.width}×${selections.length} ft`,
      },
      { label: "Height", value: `${selections.height} ft` },
      { label: "Siding", value: siding.label },
      { label: "Roof", value: roof.label },
      { label: "Siding color", value: getColor(selections.sidingColorId).label },
      { label: "Trim color", value: getColor(selections.trimColorId).label },
      { label: "Roof color", value: getColor(selections.roofColorId).label },
      {
        label: "Shutter color",
        value: getColor(selections.shutterColorId).label,
      },
      { label: "Flooring", value: flooring.label },
      { label: "Loft", value: selections.hasLoft ? "Yes" : "No" },
      { label: "Window", value: selections.hasWindow ? "Yes" : "No" },
      { label: "Vent", value: selections.hasVent ? "Yes" : "No" },
      { label: "Door", value: SELECTION_DOOR_LABELS[selections.doorStyle] },
      { label: "Door wall", value: selections.wallFace },
      { label: "Delivery ZIP", value: selections.zip },
    ],
  };
}

export function priceSummary(selections: QuoteSelections): QuoteSummary {
  const described = describeSelections(selections);
  const lines = described.specs.map((spec) => `${spec.label}: ${spec.value}`);
  lines.push(`Estimated price: ${described.estimate.total} USD`);
  return {
    text: lines.join("\n"),
    total: described.estimate.total,
    totalLabel: formatUsd(described.estimate.total),
    specs: described.specs,
    brand: {
      name: described.brand.name,
      region: described.brand.region,
      mark: described.brand.mark,
    },
  };
}
