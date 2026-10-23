import { quoteSelectionsSchema, type QuoteSelections } from "@/src/features/cpq/types";
import { CATALOG } from "@/src/features/cpq/utils/catalog";
import { configChangesSchema, type ConfigChanges } from "@/src/features/crm/quotes/types";

type NamedOption = { id: string; label: string };
type AnalyzedValue = string | number | boolean;

const walls = ["front", "left", "back", "right"] as const;

export function configChangesFromAnalysis(
  messages: string[],
  analyzed?: Record<string, AnalyzedValue>,
): ConfigChanges {
  const fromText = changesInText(messages.join("\n"));
  const fromModel = resolveAnalyzed(analyzed);
  const merged = configChangesSchema.safeParse({ ...fromText, ...fromModel });
  return merged.success ? merged.data : fromText;
}

export function selectionsWithConfigChanges(current: QuoteSelections, changes: ConfigChanges): QuoteSelections {
  const parsed = quoteSelectionsSchema.safeParse({ ...current, ...changes });
  return parsed.success ? parsed.data : current;
}

function changesInText(value: string): ConfigChanges {
  const text = value.toLowerCase().replace(/×/g, "x");
  const changes: ConfigChanges = {};

  const sizes = [...text.matchAll(/(\d{1,2})\s*x\s*(\d{1,2})/g)];
  for (const match of sizes) {
    const width = Number(match[1]);
    const length = Number(match[2]);
    const size = CATALOG.sizes.find((item) => item.width === width && item.length === length);
    if (!size) continue;
    changes.width = size.width;
    changes.length = size.length;
  }

  const styleId = latestNamed(text, CATALOG.styles);
  if (styleId) changes.styleId = styleId;

  const shingleAt = text.lastIndexOf("shingle");
  const metalRoofAt = Math.max(text.lastIndexOf("metal roof"), text.lastIndexOf("roof metal"));
  if (shingleAt >= 0 || metalRoofAt >= 0) changes.roofTypeId = metalRoofAt > shingleAt ? "metal" : "shingle";

  const sidingId = latestNamed(text, CATALOG.sidingTypes);
  if (sidingId) changes.sidingTypeId = sidingId;
  const lapAt = text.lastIndexOf("lap");
  const smartAt = Math.max(text.lastIndexOf("lp smart"), text.lastIndexOf("smart side"));
  if (lapAt >= 0 || smartAt >= 0) changes.sidingTypeId = lapAt > smartAt ? "lp-lap" : "lp-smart";

  const flooringId = latestNamed(text, CATALOG.flooring);
  if (flooringId) changes.flooringId = flooringId;
  const heavyAt = text.lastIndexOf("heavy duty");
  const prostructAt = Math.max(text.lastIndexOf("prostruct"), text.lastIndexOf("t&g"));
  if (heavyAt >= 0 || prostructAt >= 0) changes.flooringId = heavyAt > prostructAt ? "heavy-duty" : "tg-prostruct";

  applyColorMentions(text, changes);

  const loft = lastFlag(text, ["with a loft", "add a loft", "include a loft", "has a loft", "want a loft"], ["no loft", "without a loft", "remove the loft", "remove loft"]);
  if (loft != null) changes.hasLoft = loft;
  const window = lastFlag(text, ["with a window", "add a window", "include a window", "has a window"], ["no window", "without a window", "remove the window", "remove window"]);
  if (window != null) changes.hasWindow = window;
  const vent = lastFlag(text, ["with a vent", "add a vent", "include a vent", "has a vent"], ["no vent", "without a vent", "remove the vent", "remove vent"]);
  if (vent != null) changes.hasVent = vent;

  const doubleAt = Math.max(text.lastIndexOf("double door"), text.lastIndexOf("double doors"));
  const singleAt = text.lastIndexOf("single door");
  const noneAt = Math.max(text.lastIndexOf("no door"), text.lastIndexOf("without a door"), text.lastIndexOf("remove the door"), text.lastIndexOf("remove door"));
  const doorAt = Math.max(doubleAt, singleAt, noneAt);
  if (doorAt >= 0) {
    changes.doorStyle = doorAt === doubleAt ? "double" : doorAt === singleAt ? "single" : "none";
  }

  let wallAt = -1;
  for (const wall of walls) {
    const at = Math.max(text.lastIndexOf(`${wall} wall`), text.lastIndexOf(`on the ${wall}`), text.lastIndexOf(`to the ${wall}`));
    if (at > wallAt) {
      wallAt = at;
      changes.wallFace = wall;
    }
  }

  const height = lastHeight(text);
  if (height != null) changes.height = height;
  const zip = lastZip(text);
  if (zip) changes.zip = zip;

  const parsed = configChangesSchema.safeParse(changes);
  return parsed.success ? parsed.data : {};
}

function applyColorMentions(text: string, changes: ConfigChanges) {
  const hits: Array<{ index: number; id: string }> = [];
  const claimed: Array<[number, number]> = [];
  const colors = [...CATALOG.colors].sort((left, right) => right.label.length - left.label.length);
  for (const color of colors) {
    const needle = color.label.toLowerCase();
    for (const index of allIndexes(text, needle)) {
      const end = index + needle.length;
      if (claimed.some(([start, stop]) => index < stop && end > start)) continue;
      claimed.push([index, end]);
      hits.push({ index, id: color.id });
    }
  }
  hits.sort((left, right) => left.index - right.index);
  for (const hit of hits) {
    const window = text.slice(Math.max(0, hit.index - 40), hit.index);
    const roof = window.includes("roof");
    const trim = window.includes("trim");
    const shutter = window.includes("shutter");
    const siding = window.includes("siding");
    if (roof && !siding && !trim && !shutter) changes.roofColorId = hit.id;
    else if (shutter && !siding && !trim) changes.shutterColorId = hit.id;
    else if (trim && siding) {
      changes.trimColorId = hit.id;
      changes.sidingColorId = hit.id;
    } else if (trim) changes.trimColorId = hit.id;
    else if (siding) changes.sidingColorId = hit.id;
    else {
      changes.sidingColorId = hit.id;
      changes.trimColorId = hit.id;
    }
  }
}

function resolveAnalyzed(analyzed: Record<string, AnalyzedValue> | undefined): ConfigChanges {
  if (!analyzed) return {};
  const changes: ConfigChanges = {};
  const styleId = namedId(CATALOG.styles, analyzed.styleId);
  if (styleId) changes.styleId = styleId;
  const sidingTypeId = namedId(CATALOG.sidingTypes, analyzed.sidingTypeId);
  if (sidingTypeId) changes.sidingTypeId = sidingTypeId;
  const roofTypeId = namedId(CATALOG.roofTypes, analyzed.roofTypeId);
  if (roofTypeId) changes.roofTypeId = roofTypeId;
  const sidingColorId = namedId(CATALOG.colors, analyzed.sidingColorId);
  if (sidingColorId) changes.sidingColorId = sidingColorId;
  const trimColorId = namedId(CATALOG.colors, analyzed.trimColorId);
  if (trimColorId) changes.trimColorId = trimColorId;
  const roofColorId = namedId(CATALOG.colors, analyzed.roofColorId);
  if (roofColorId) changes.roofColorId = roofColorId;
  const shutterColorId = namedId(CATALOG.colors, analyzed.shutterColorId);
  if (shutterColorId) changes.shutterColorId = shutterColorId;
  const flooringId = namedId(CATALOG.flooring, analyzed.flooringId);
  if (flooringId) changes.flooringId = flooringId;

  const width = asNumber(analyzed.width);
  const length = asNumber(analyzed.length);
  if (width != null && length != null && CATALOG.sizes.some((size) => size.width === width && size.length === length)) {
    changes.width = width;
    changes.length = length;
  }
  const height = asNumber(analyzed.height);
  if (height != null && height >= 4 && height <= 20) changes.height = height;

  const loft = asFlag(analyzed.hasLoft);
  if (loft != null) changes.hasLoft = loft;
  const window = asFlag(analyzed.hasWindow);
  if (window != null) changes.hasWindow = window;
  const vent = asFlag(analyzed.hasVent);
  if (vent != null) changes.hasVent = vent;

  if (analyzed.doorStyle === "single" || analyzed.doorStyle === "double" || analyzed.doorStyle === "none") {
    changes.doorStyle = analyzed.doorStyle;
  }
  if (analyzed.wallFace === "front" || analyzed.wallFace === "left" || analyzed.wallFace === "back" || analyzed.wallFace === "right") {
    changes.wallFace = analyzed.wallFace;
  }
  if (typeof analyzed.zip === "string" && /^\d{5}$/.test(analyzed.zip.trim())) changes.zip = analyzed.zip.trim();

  const parsed = configChangesSchema.safeParse(changes);
  return parsed.success ? parsed.data : {};
}

function namedId(items: NamedOption[], value: AnalyzedValue | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim().toLowerCase();
  if (text.length < 3) return undefined;
  const ranked = [...items].sort((left, right) => right.label.length - left.label.length);
  return ranked.find((item) => {
    const label = item.label.toLowerCase();
    const id = item.id.replace(/-/g, " ");
    return item.id === text || label === text || id === text || text.includes(label) || text.includes(id);
  })?.id;
}

function latestNamed(text: string, items: NamedOption[]): string | undefined {
  const ranked = [...items].sort((left, right) => right.label.length - left.label.length);
  const claimed: Array<[number, number]> = [];
  let bestAt = -1;
  let bestId: string | undefined;
  for (const item of ranked) {
    for (const needle of [item.label.toLowerCase(), item.id.replace(/-/g, " ")]) {
      if (needle.length < 3) continue;
      for (const index of allIndexes(text, needle)) {
        const end = index + needle.length;
        if (claimed.some(([start, stop]) => index < stop && end > start)) continue;
        claimed.push([index, end]);
        if (index >= bestAt) {
          bestAt = index;
          bestId = item.id;
        }
      }
    }
  }
  return bestId;
}

function lastFlag(text: string, enable: string[], disable: string[]): boolean | undefined {
  let at = -1;
  let value: boolean | undefined;
  for (const phrase of enable) {
    const found = text.lastIndexOf(phrase);
    if (found > at) {
      at = found;
      value = true;
    }
  }
  for (const phrase of disable) {
    const found = text.lastIndexOf(phrase);
    if (found > at) {
      at = found;
      value = false;
    }
  }
  return value;
}

function lastHeight(text: string): number | undefined {
  let height: number | undefined;
  for (const match of text.matchAll(/(?:height|tall|high)\D{0,8}(\d{1,2}(?:\.\d+)?)|(\d{1,2}(?:\.\d+)?)\s*(?:ft|feet|')\s*(?:tall|high|wall)/g)) {
    const value = Number(match[1] ?? match[2]);
    if (value >= 4 && value <= 20) height = value;
  }
  return height;
}

function lastZip(text: string): string | undefined {
  let zip: string | undefined;
  for (const match of text.matchAll(/(?:zip(?:\s*code)?|postal)\D{0,8}(\d{5})/g)) zip = match[1];
  return zip;
}

function asNumber(value: AnalyzedValue | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

function asFlag(value: AnalyzedValue | undefined): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;
  const text = value.trim().toLowerCase();
  if (text === "true" || text === "yes") return true;
  if (text === "false" || text === "no") return false;
  return undefined;
}

function allIndexes(text: string, needle: string): number[] {
  const indexes: number[] = [];
  let from = 0;
  while (from < text.length) {
    const index = text.indexOf(needle, from);
    if (index < 0) break;
    indexes.push(index);
    from = index + needle.length;
  }
  return indexes;
}
