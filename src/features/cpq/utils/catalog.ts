import catalog from "@/src/features/cpq/config/catalog.json";
import defaultConfig from "@/src/features/cpq/config/default-config.json";
import { buildingConfigSchema, type BuildingConfig } from "@/src/features/cpq/types";

export type { BuildingConfig };
export type StyleOption = (typeof catalog.styles)[number];
export type ColorOption = (typeof catalog.colors)[number];
export type SidingType = (typeof catalog.sidingTypes)[number];
export type RoofType = (typeof catalog.roofTypes)[number];
export type DoorStyle = BuildingConfig["doorStyle"];

export const CATALOG = catalog;

export const DEFAULT_ZIP = defaultConfig.zip;
export const DEFAULT_LNG = defaultConfig.lng;

export const DEFAULT_BUILDING_CONFIG: BuildingConfig = buildingConfigSchema.parse(defaultConfig);

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
