import priceSheet from "@/src/config/pricing.json";
import {
  getColor,
  getFlooring,
  getRoofType,
  getSidingType,
  getStyle,
  type ShedConfig,
} from "@/src/config/catalog";

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

export type ShedEstimate = {
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

const DOOR_LABELS: Record<ShedConfig["doorStyle"], string> = {
  single: "Single door",
  double: "Double door",
  none: "No door",
};

function selectedOptions(config: ShedConfig): { id: string; label: string }[] {
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

export function estimateShed(
  config: ShedConfig,
  prices: PriceSheet = PRICE_SHEET,
): ShedEstimate {
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
