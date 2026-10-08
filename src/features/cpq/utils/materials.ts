import type { RoofType, SidingType } from "@/src/features/cpq/utils/catalog";

export type SidingMaps = {
  albedo: string;
  normal: string;
  roughness: string;
  metalness?: string;
  ao: string;
};

export type RoofMaps = {
  albedo: string;
  normal: string;
  ao: string;
  height: string;
  roughness?: string;
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
