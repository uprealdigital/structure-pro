import type { QuoteSelections } from "@/src/features/cpq/types";
import type { ConfigChanges } from "@/src/features/crm/quotes/types";

const configKeys = [
  "styleId",
  "width",
  "length",
  "height",
  "sidingTypeId",
  "roofTypeId",
  "sidingColorId",
  "trimColorId",
  "roofColorId",
  "shutterColorId",
  "flooringId",
  "hasLoft",
  "hasWindow",
  "hasVent",
  "doorStyle",
  "wallFace",
  "zip",
] as const satisfies readonly (keyof QuoteSelections)[];

export function changedConfig(previous: QuoteSelections | undefined, next: QuoteSelections): ConfigChanges {
  if (!previous) return {};
  const changes: ConfigChanges = {};
  for (const key of configKeys) {
    if (previous[key] !== next[key]) Object.assign(changes, { [key]: next[key] });
  }
  return changes;
}
