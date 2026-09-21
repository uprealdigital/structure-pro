import catalog from "@/src/config/pricing.json";

export type StyleOption = (typeof catalog.styles)[number];
export type ColorOption = (typeof catalog.colors)[number];
export type SidingType = (typeof catalog.sidingTypes)[number];
export type RoofType = (typeof catalog.roofTypes)[number];
export type DoorStyle = "single" | "double" | "none";
export type RoofShape = "gable" | "gambrel";

export const DEFAULT_GAMBREL_BREAK_RATIO = 0.5;
export const DEFAULT_GAMBREL_BREAK_LIFT = 1.65;

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
  hasVent: boolean;
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

export type SidingMaps = {
  albedo: string;
  normal: string;
  roughness: string;
  metalness?: string;
  ao: string;
};

export function getSidingMaps(type: SidingType): SidingMaps | null {
  if (!("maps" in type) || !type.maps) {
    return null;
  }
  return type.maps;
}

export function getSidingTileFeet(type: SidingType): [number, number] {
  if (
    "tileFeet" in type &&
    Array.isArray(type.tileFeet) &&
    type.tileFeet.length === 2
  ) {
    return [type.tileFeet[0], type.tileFeet[1]];
  }
  return [4, 4];
}

export function getSidingMetalness(type: SidingType): number {
  return "metalness" in type && typeof type.metalness === "number"
    ? type.metalness
    : 0.04;
}

export function getSidingNormalScale(type: SidingType): [number, number] {
  if (
    "normalScale" in type &&
    Array.isArray(type.normalScale) &&
    type.normalScale.length === 2
  ) {
    return [type.normalScale[0], type.normalScale[1]];
  }
  return [1, 1];
}

export function getSidingAoIntensity(type: SidingType): number {
  return "aoMapIntensity" in type && typeof type.aoMapIntensity === "number"
    ? type.aoMapIntensity
    : 1;
}

export function getRoofType(id: string): RoofType {
  return catalog.roofTypes.find((item) => item.id === id) ?? catalog.roofTypes[0];
}

export type RoofMaps = {
  albedo: string;
  normal: string;
  ao: string;
  height: string;
  roughness?: string;
};

export function getRoofMaps(type: RoofType): RoofMaps | null {
  if (!("maps" in type) || !type.maps) {
    return null;
  }
  return type.maps;
}

export function getRoofTileFeet(type: RoofType): [number, number] {
  if (
    "tileFeet" in type &&
    Array.isArray(type.tileFeet) &&
    type.tileFeet.length === 2
  ) {
    return [type.tileFeet[0], type.tileFeet[1]];
  }
  return [4, 4];
}

export function getRoofNormalScale(type: RoofType): [number, number] {
  if (
    "normalScale" in type &&
    Array.isArray(type.normalScale) &&
    type.normalScale.length === 2
  ) {
    return [type.normalScale[0], type.normalScale[1]];
  }
  return [1, 1];
}

export function getFlooring(id: string) {
  return catalog.flooring.find((item) => item.id === id) ?? catalog.flooring[0];
}

export function getRoofShape(style: StyleOption): RoofShape {
  return style.roofShape === "gambrel" ? "gambrel" : "gable";
}

export function getGambrelParams(style: StyleOption): {
  breakRatio: number;
  breakLift: number;
} {
  return {
    breakRatio:
      "breakRatio" in style && typeof style.breakRatio === "number"
        ? style.breakRatio
        : DEFAULT_GAMBREL_BREAK_RATIO,
    breakLift:
      "breakLift" in style && typeof style.breakLift === "number"
        ? style.breakLift
        : DEFAULT_GAMBREL_BREAK_LIFT,
  };
}

/** Rise from wall top to ridge for a straight gable of the given half-span. */
export function gableRise(halfSpan: number, pitch: number): number {
  return halfSpan * Math.tan(pitch);
}

/** Rise from wall top to the gambrel break, as a lift on the gable line at that x. */
export function gambrelBreakRise(
  halfSpan: number,
  pitch: number,
  breakRatio = DEFAULT_GAMBREL_BREAK_RATIO,
  breakLift = DEFAULT_GAMBREL_BREAK_LIFT,
): number {
  return gableRise(halfSpan, pitch) * breakRatio * breakLift;
}

/** Peak rise from wall top. Gambrel keeps the same ridge as a gable of this pitch. */
export function roofPeakRise(style: StyleOption, width: number): number {
  return gableRise(width / 2, style.pitch);
}

export function roofPeakHeight(
  style: StyleOption,
  wallHeight: number,
  width: number,
): number {
  return wallHeight + roofPeakRise(style, width);
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
  const style = getStyle(config.styleId);
  const perSqFt =
    "basePerSqFt" in style && typeof style.basePerSqFt === "number"
      ? style.basePerSqFt
      : pricing.basePerSqFt;
  const styleAdjustment =
    "baseAdjustment" in style && typeof style.baseAdjustment === "number"
      ? style.baseAdjustment
      : 0;
  const base = Math.round(config.width * config.length * perSqFt) + styleAdjustment;
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
      next = { ...next, sidingColorId: color.id, trimColorId: color.id };
      notes.push(`${color.label} siding and trim`);
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
