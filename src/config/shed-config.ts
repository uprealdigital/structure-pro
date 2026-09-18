import catalog from "@/src/config/pricing.json";

export type StyleOption = (typeof catalog.styles)[number];
export type ColorOption = (typeof catalog.colors)[number];
export type SidingType = (typeof catalog.sidingTypes)[number];
export type RoofType = (typeof catalog.roofTypes)[number];
export type DoorStyle = "single" | "double" | "none";

export type ShedConfig = {
  styleId: string;
  width: number;
  length: number;
  height: number;
  sidingTypeId: string;
  roofTypeId: string;
  sidingColorId: string;
  trimColorId: string;
  roofColorId: string;
  shutterColorId: string;
  flooringId: string;
  hasLoft: boolean;
  hasWindow: boolean;
  doorStyle: DoorStyle;
  wallFace: "front" | "left" | "back" | "right";
};

export const CATALOG = catalog;

export const DEFAULT_SHED_CONFIG: ShedConfig = {
  ...catalog.defaults,
  doorStyle: catalog.defaults.doorStyle as DoorStyle,
  wallFace: catalog.defaults.wallFace as ShedConfig["wallFace"],
};

export function getStyle(id: string): StyleOption {
  return catalog.styles.find((item) => item.id === id) ?? catalog.styles[0];
}

export function getColor(id: string): ColorOption {
  return catalog.colors.find((item) => item.id === id) ?? catalog.colors[0];
}

export function getSidingType(id: string): SidingType {
  return (
    catalog.sidingTypes.find((item) => item.id === id) ?? catalog.sidingTypes[0]
  );
}

export function getRoofType(id: string): RoofType {
  return catalog.roofTypes.find((item) => item.id === id) ?? catalog.roofTypes[0];
}

export function getFlooring(id: string) {
  return catalog.flooring.find((item) => item.id === id) ?? catalog.flooring[0];
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function estimateShed(config: ShedConfig) {
  const { pricing } = catalog;
  const base = Math.round(config.width * config.length * pricing.basePerSqFt);
  const interior = config.hasLoft ? pricing.interior : 0;
  const openings =
    config.doorStyle === "none" && !config.hasWindow
      ? 0
      : pricing.doorsWindows;
  const total =
    base +
    pricing.sidingFinish +
    openings +
    interior +
    pricing.delivery;
  const monthly = Math.round(total / 53.4);
  const financeMonthly = Math.round(total / pricing.financeMonths);
  const style = getStyle(config.styleId);
  const siding = getColor(config.sidingColorId);
  const roof = getColor(config.roofColorId);

  return {
    total,
    monthly,
    financeMonthly,
    lines: [
      {
        label: `Base Studio (${config.width}×${config.length} ${style.productTitle})`,
        amount: base,
      },
      {
        label: `Siding & Finish (${siding.label} + ${roof.label} Roof)`,
        amount: pricing.sidingFinish,
      },
      {
        label: "Doors & Windows (Full-Lite French Glass + Casement)",
        amount: openings,
      },
      { label: "Interior & Electrical Rough-in", amount: interior },
      { label: "Delivery & Stamped Engineering", amount: pricing.delivery },
    ],
  };
}

export function applyAssistantPrompt(
  config: ShedConfig,
  prompt: string,
): { config: ShedConfig; message: string } {
  const text = prompt.trim().toLowerCase();
  if (!text) {
    return { config, message: "Tell me a color, size, roof, or style to change." };
  }

  let next = { ...config };
  const notes: string[] = [];

  const sizeMatch = text.match(/(\d{1,2})\s*[x×]\s*(\d{1,2})/);
  if (sizeMatch) {
    const width = Number(sizeMatch[1]);
    const length = Number(sizeMatch[2]);
    const size = catalog.sizes.find(
      (item) => item.width === width && item.length === length,
    );
    if (size) {
      next = { ...next, width: size.width, length: size.length };
      notes.push(`size ${size.width}×${size.length}`);
    }
  }

  for (const style of catalog.styles) {
    if (text.includes(style.label.toLowerCase()) || text.includes(style.id.replace(/-/g, " "))) {
      next = { ...next, styleId: style.id };
      notes.push(style.label);
      break;
    }
  }

  if (text.includes("metal roof") || /\bmetal\b/.test(text)) {
    next = { ...next, roofTypeId: "metal" };
    notes.push("metal roof");
  }
  if (text.includes("shingle")) {
    next = { ...next, roofTypeId: "shingle" };
    notes.push("shingle roof");
  }

  const colorHits = [...catalog.colors]
    .sort((a, b) => b.label.length - a.label.length)
    .filter((color) => text.includes(color.label.toLowerCase()));

  if (colorHits.length) {
    const color = colorHits[0];
    if (text.includes("roof")) {
      next = { ...next, roofColorId: color.id };
      notes.push(`${color.label} roof`);
    } else if (text.includes("trim")) {
      next = { ...next, trimColorId: color.id };
      notes.push(`${color.label} trim`);
    } else if (text.includes("shutter")) {
      next = { ...next, shutterColorId: color.id };
      notes.push(`${color.label} shutters`);
    } else {
      next = { ...next, sidingColorId: color.id };
      notes.push(`${color.label} siding`);
    }
  }

  if (!notes.length) {
    return {
      config,
      message: "I can change style, size, siding color, trim, or roof. Try “red barn siding”.",
    };
  }

  return {
    config: next,
    message: `Updated ${notes.join(", ")}.`,
  };
}
