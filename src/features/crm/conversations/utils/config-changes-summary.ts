import type { ConfigChanges } from "@/src/features/crm/quotes/types";
import { getColor, getFlooring, getRoofType, getSidingType, getStyle } from "@/src/features/cpq/utils/catalog";
import { copy } from "@/src/features/crm/conversations/locales/en";

export type ConfigChangeRow = {
  id: string;
  kind: "added" | "changed" | "removed";
  text: string;
};

export function configChangeRows(changes: ConfigChanges): ConfigChangeRow[] {
  const rows: ConfigChangeRow[] = [];

  if (changes.styleId) rows.push({ id: "style", kind: "changed", text: copy.styleChanged(getStyle(changes.styleId).productTitle) });
  if (changes.width != null && changes.length != null) {
    rows.push({ id: "size", kind: "changed", text: copy.sizeChanged(copy.sizeValue(changes.width, changes.length)) });
  } else if (changes.width != null) {
    rows.push({ id: "width", kind: "changed", text: copy.widthChanged(changes.width) });
  } else if (changes.length != null) {
    rows.push({ id: "length", kind: "changed", text: copy.lengthChanged(changes.length) });
  }
  if (changes.height != null) rows.push({ id: "height", kind: "changed", text: copy.heightChanged(copy.heightValue(changes.height)) });
  if (changes.sidingTypeId) rows.push({ id: "siding", kind: "changed", text: copy.sidingChanged(getSidingType(changes.sidingTypeId).label) });
  if (changes.roofTypeId) rows.push({ id: "roof", kind: "changed", text: copy.roofChanged(getRoofType(changes.roofTypeId).label) });
  if (changes.sidingColorId) rows.push({ id: "siding-color", kind: "changed", text: copy.sidingColorChanged(getColor(changes.sidingColorId).label) });
  if (changes.trimColorId) rows.push({ id: "trim-color", kind: "changed", text: copy.trimColorChanged(getColor(changes.trimColorId).label) });
  if (changes.roofColorId) rows.push({ id: "roof-color", kind: "changed", text: copy.roofColorChanged(getColor(changes.roofColorId).label) });
  if (changes.shutterColorId) rows.push({ id: "shutter-color", kind: "changed", text: copy.shutterColorChanged(getColor(changes.shutterColorId).label) });
  if (changes.flooringId) rows.push({ id: "flooring", kind: "changed", text: copy.flooringChanged(getFlooring(changes.flooringId).label) });
  if (changes.hasLoft != null) rows.push({ id: "loft", kind: changes.hasLoft ? "added" : "removed", text: changes.hasLoft ? copy.loftAdded : copy.loftRemoved });
  if (changes.hasWindow != null) rows.push({ id: "window", kind: changes.hasWindow ? "added" : "removed", text: changes.hasWindow ? copy.windowAdded : copy.windowRemoved });
  if (changes.hasVent != null) rows.push({ id: "vent", kind: changes.hasVent ? "added" : "removed", text: changes.hasVent ? copy.ventAdded : copy.ventRemoved });
  if (changes.doorStyle === "none") rows.push({ id: "door", kind: "removed", text: copy.doorRemoved });
  if (changes.doorStyle === "single") rows.push({ id: "door", kind: "changed", text: copy.doorChangedSingle });
  if (changes.doorStyle === "double") rows.push({ id: "door", kind: "changed", text: copy.doorChangedDouble });
  if (changes.wallFace) rows.push({ id: "door-wall", kind: "changed", text: copy.doorMoved(copy.wallFaceLabel[changes.wallFace]) });
  if (changes.zip) rows.push({ id: "zip", kind: "changed", text: copy.zipChanged(changes.zip) });

  return rows;
}

export function configChangesSummary(changes: ConfigChanges): string {
  return configChangeRows(changes).map((row) => row.text).join(", ");
}
