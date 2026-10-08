import { CATALOG, type BuildingConfig } from "@/src/features/cpq/utils/catalog";

export function applyAssistantPrompt(
  config: BuildingConfig,
  prompt: string,
): { config: BuildingConfig; message: string } {
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
    const size = CATALOG.sizes.find(
      (item) => item.width === width && item.length === length,
    );
    if (size) {
      next = { ...next, width: size.width, length: size.length };
      notes.push(`size ${size.width}×${size.length}`);
    }
  }

  for (const style of CATALOG.styles) {
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

  const colorHits = [...CATALOG.colors]
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
