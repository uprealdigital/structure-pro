import type { ConfigChanges } from "@/src/features/crm/quotes/types";
import { getColor, getFlooring, getRoofType, getSidingType, getStyle } from "@/src/features/cpq/utils/catalog";
import { copy } from "@/src/features/crm/conversations/locales/en";

export function configChangesSummary(changes: ConfigChanges): string {
  const parts: string[] = [];

  if (changes.styleId) parts.push(copy.styleChanged(getStyle(changes.styleId).productTitle));
  if (changes.width != null && changes.length != null) {
    parts.push(copy.sizeChanged(copy.sizeValue(changes.width, changes.length)));
  } else if (changes.width != null) {
    parts.push(copy.widthChanged(changes.width));
  } else if (changes.length != null) {
    parts.push(copy.lengthChanged(changes.length));
  }
  if (changes.height != null) parts.push(copy.heightChanged(copy.heightValue(changes.height)));
  if (changes.sidingTypeId) parts.push(copy.sidingChanged(getSidingType(changes.sidingTypeId).label));
  if (changes.roofTypeId) parts.push(copy.roofChanged(getRoofType(changes.roofTypeId).label));
  if (changes.sidingColorId) parts.push(copy.sidingColorChanged(getColor(changes.sidingColorId).label));
  if (changes.trimColorId) parts.push(copy.trimColorChanged(getColor(changes.trimColorId).label));
  if (changes.roofColorId) parts.push(copy.roofColorChanged(getColor(changes.roofColorId).label));
  if (changes.shutterColorId) parts.push(copy.shutterColorChanged(getColor(changes.shutterColorId).label));
  if (changes.flooringId) parts.push(copy.flooringChanged(getFlooring(changes.flooringId).label));
  if (changes.hasLoft != null) parts.push(changes.hasLoft ? copy.loftAdded : copy.loftRemoved);
  if (changes.hasWindow != null) parts.push(changes.hasWindow ? copy.windowAdded : copy.windowRemoved);
  if (changes.hasVent != null) parts.push(changes.hasVent ? copy.ventAdded : copy.ventRemoved);
  if (changes.doorStyle === "none") parts.push(copy.doorRemoved);
  if (changes.doorStyle === "single") parts.push(copy.doorChangedSingle);
  if (changes.doorStyle === "double") parts.push(copy.doorChangedDouble);
  if (changes.wallFace) parts.push(copy.doorMoved(copy.wallFaceLabel[changes.wallFace]));
  if (changes.zip) parts.push(copy.zipChanged(changes.zip));

  return parts.join(", ");
}
