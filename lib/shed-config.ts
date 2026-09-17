export const SIZE_RANGES = {
  width: { min: 6, max: 16, step: 1 },
  length: { min: 8, max: 20, step: 1 },
  height: { min: 7, max: 10, step: 1 },
} as const;

export type SidingId = "white-vinyl" | "barn-red" | "cedar" | "charcoal";
export type RoofId = "charcoal-shingle" | "evergreen-metal" | "tan";

export type SidingOption = {
  id: SidingId;
  label: string;
  color: string;
  roughness: number;
};

export type RoofOption = {
  id: RoofId;
  label: string;
  color: string;
  metalness: number;
  roughness: number;
};

export type ShedConfig = {
  width: number;
  length: number;
  height: number;
  sidingId: SidingId;
  roofId: RoofId;
};

export const SIDING_OPTIONS: readonly SidingOption[] = [
  {
    id: "white-vinyl",
    label: "White vinyl",
    color: "#f4f1ea",
    roughness: 0.62,
  },
  {
    id: "barn-red",
    label: "Barn red",
    color: "#8b2e2e",
    roughness: 0.68,
  },
  {
    id: "cedar",
    label: "Cedar",
    color: "#c4784a",
    roughness: 0.82,
  },
  {
    id: "charcoal",
    label: "Charcoal",
    color: "#3a3d42",
    roughness: 0.58,
  },
];

export const ROOF_OPTIONS: readonly RoofOption[] = [
  {
    id: "charcoal-shingle",
    label: "Charcoal shingle",
    color: "#2f3238",
    metalness: 0.04,
    roughness: 0.92,
  },
  {
    id: "evergreen-metal",
    label: "Evergreen metal",
    color: "#2d5a45",
    metalness: 0.72,
    roughness: 0.32,
  },
  {
    id: "tan",
    label: "Tan",
    color: "#c4a574",
    metalness: 0.12,
    roughness: 0.78,
  },
];

export const DEFAULT_SHED_CONFIG: ShedConfig = {
  width: 10,
  length: 12,
  height: 8,
  sidingId: "cedar",
  roofId: "charcoal-shingle",
};

export function getSiding(id: SidingId): SidingOption {
  return SIDING_OPTIONS.find((option) => option.id === id) ?? SIDING_OPTIONS[0];
}

export function getRoof(id: RoofId): RoofOption {
  return ROOF_OPTIONS.find((option) => option.id === id) ?? ROOF_OPTIONS[0];
}

export function formatShedSummary(config: ShedConfig): string {
  const siding = getSiding(config.sidingId);
  const roof = getRoof(config.roofId);
  return `${config.width}×${config.length} ft · ${siding.label} · ${roof.label}`;
}
