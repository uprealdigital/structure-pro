import type { StyleOption } from "@/src/features/cpq/utils/catalog";

export const DEFAULT_GAMBREL_BREAK_RATIO = 0.5;
export const DEFAULT_GAMBREL_BREAK_LIFT = 1.65;

export type RoofShape = "gable" | "gambrel";

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
