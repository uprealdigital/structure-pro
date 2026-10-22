import type { QuoteSelections } from "@/src/features/cpq/types";
import {
  getColor,
  getFlooring,
  getRoofType,
  getSidingType,
  getStyle,
} from "@/src/features/cpq/utils/catalog";
import { formatUsd, priceSummary } from "@/src/features/cpq/utils/pricing";
import { copy } from "@/src/features/crm/conversations/locales/en";
import type { ConversationQuoteRevision } from "@/src/features/crm/conversations/types";

export type DesignPreviewChange = {
  id: string;
  kind: "price" | "added" | "changed" | "removed";
  text: string;
};

export function previousSentRevision(
  revisions: ConversationQuoteRevision[],
  viewed: ConversationQuoteRevision,
): ConversationQuoteRevision | null {
  let match: ConversationQuoteRevision | null = null;
  for (const revision of revisions) {
    if (revision.status !== "sent" || revision.revisionNumber >= viewed.revisionNumber) continue;
    if (!match || revision.revisionNumber > match.revisionNumber) match = revision;
  }
  return match;
}

function priceDeltaLabel(delta: number): string {
  if (delta > 0) return `+${formatUsd(delta)}`;
  return formatUsd(delta);
}

export function designPreviewChanges(
  previous: QuoteSelections,
  current: QuoteSelections,
): DesignPreviewChange[] {
  const changes: DesignPreviewChange[] = [];
  const beforeTotal = priceSummary(previous).total;
  const afterTotal = priceSummary(current).total;
  if (beforeTotal !== afterTotal) {
    changes.push({
      id: "price",
      kind: "price",
      text: copy.priceUpdated(formatUsd(beforeTotal), formatUsd(afterTotal), priceDeltaLabel(afterTotal - beforeTotal)),
    });
  }

  if (previous.styleId !== current.styleId) {
    changes.push({
      id: "style",
      kind: "changed",
      text: copy.styleChanged(getStyle(current.styleId).productTitle),
    });
  }
  if (previous.width !== current.width || previous.length !== current.length) {
    changes.push({
      id: "size",
      kind: "changed",
      text: copy.sizeChanged(copy.sizeValue(current.width, current.length)),
    });
  }
  if (previous.height !== current.height) {
    changes.push({
      id: "height",
      kind: "changed",
      text: copy.heightChanged(copy.heightValue(current.height)),
    });
  }
  if (previous.sidingTypeId !== current.sidingTypeId) {
    changes.push({
      id: "siding",
      kind: "changed",
      text: copy.sidingChanged(getSidingType(current.sidingTypeId).label),
    });
  }
  if (previous.roofTypeId !== current.roofTypeId) {
    changes.push({
      id: "roof",
      kind: "changed",
      text: copy.roofChanged(getRoofType(current.roofTypeId).label),
    });
  }
  if (previous.sidingColorId !== current.sidingColorId) {
    changes.push({
      id: "siding-color",
      kind: "changed",
      text: copy.sidingColorChanged(getColor(current.sidingColorId).label),
    });
  }
  if (previous.trimColorId !== current.trimColorId) {
    changes.push({
      id: "trim-color",
      kind: "changed",
      text: copy.trimColorChanged(getColor(current.trimColorId).label),
    });
  }
  if (previous.roofColorId !== current.roofColorId) {
    changes.push({
      id: "roof-color",
      kind: "changed",
      text: copy.roofColorChanged(getColor(current.roofColorId).label),
    });
  }
  if (previous.shutterColorId !== current.shutterColorId) {
    changes.push({
      id: "shutter-color",
      kind: "changed",
      text: copy.shutterColorChanged(getColor(current.shutterColorId).label),
    });
  }
  if (previous.flooringId !== current.flooringId) {
    changes.push({
      id: "flooring",
      kind: "changed",
      text: copy.flooringChanged(getFlooring(current.flooringId).label),
    });
  }
  if (previous.hasLoft !== current.hasLoft) {
    changes.push({
      id: "loft",
      kind: current.hasLoft ? "added" : "removed",
      text: current.hasLoft ? copy.loftAdded : copy.loftRemoved,
    });
  }
  if (previous.hasWindow !== current.hasWindow) {
    changes.push({
      id: "window",
      kind: current.hasWindow ? "added" : "removed",
      text: current.hasWindow ? copy.windowAdded : copy.windowRemoved,
    });
  }
  if (previous.hasVent !== current.hasVent) {
    changes.push({
      id: "vent",
      kind: current.hasVent ? "added" : "removed",
      text: current.hasVent ? copy.ventAdded : copy.ventRemoved,
    });
  }
  if (previous.doorStyle !== current.doorStyle) {
    if (current.doorStyle === "none") {
      changes.push({ id: "door", kind: "removed", text: copy.doorRemoved });
    } else if (previous.doorStyle === "none") {
      changes.push({
        id: "door",
        kind: "added",
        text: current.doorStyle === "double" ? copy.doorAddedDouble : copy.doorAddedSingle,
      });
    } else {
      changes.push({
        id: "door",
        kind: "changed",
        text: current.doorStyle === "double" ? copy.doorChangedDouble : copy.doorChangedSingle,
      });
    }
  }
  if (previous.wallFace !== current.wallFace && current.doorStyle !== "none") {
    changes.push({
      id: "door-wall",
      kind: "changed",
      text: copy.doorMoved(copy.wallFaceLabel[current.wallFace]),
    });
  }
  if (previous.zip !== current.zip) {
    changes.push({
      id: "zip",
      kind: "changed",
      text: copy.zipChanged(current.zip),
    });
  }

  return changes;
}
