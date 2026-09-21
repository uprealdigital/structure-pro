import {
  type ShedConfig,
  CATALOG,
  estimateShed,
  getColor,
  getFlooring,
  getRoofType,
  getSidingType,
  getStyle,
} from "@/src/config/shed-config";
import type { QuoteSelections } from "@/src/lib/quote-types";

const DOOR_LABELS: Record<ShedConfig["doorStyle"], string> = {
  single: "Single door",
  double: "Double door",
  none: "None",
};

export function isQuoteSelections(value: unknown): value is QuoteSelections {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.zip === "string" &&
    typeof item.styleId === "string" &&
    typeof item.width === "number" &&
    typeof item.length === "number" &&
    typeof item.height === "number" &&
    typeof item.sidingTypeId === "string" &&
    typeof item.roofTypeId === "string" &&
    typeof item.sidingColorId === "string" &&
    typeof item.trimColorId === "string" &&
    typeof item.roofColorId === "string" &&
    typeof item.shutterColorId === "string" &&
    typeof item.flooringId === "string" &&
    typeof item.hasLoft === "boolean" &&
    typeof item.hasWindow === "boolean" &&
    typeof item.hasVent === "boolean" &&
    (item.doorStyle === "single" ||
      item.doorStyle === "double" ||
      item.doorStyle === "none") &&
    (item.wallFace === "front" ||
      item.wallFace === "left" ||
      item.wallFace === "back" ||
      item.wallFace === "right")
  );
}

export function toShedConfig(selections: QuoteSelections): ShedConfig {
  return {
    styleId: selections.styleId,
    width: selections.width,
    length: selections.length,
    height: selections.height,
    sidingTypeId: selections.sidingTypeId,
    roofTypeId: selections.roofTypeId,
    sidingColorId: selections.sidingColorId,
    trimColorId: selections.trimColorId,
    roofColorId: selections.roofColorId,
    shutterColorId: selections.shutterColorId,
    flooringId: selections.flooringId,
    hasLoft: selections.hasLoft,
    hasWindow: selections.hasWindow,
    hasVent: selections.hasVent,
    doorStyle: selections.doorStyle,
    wallFace: selections.wallFace,
  };
}

export function describeSelections(selections: QuoteSelections) {
  const style = getStyle(selections.styleId);
  const siding = getSidingType(selections.sidingTypeId);
  const roof = getRoofType(selections.roofTypeId);
  const flooring = getFlooring(selections.flooringId);
  const estimate = estimateShed(toShedConfig(selections));

  return {
    style,
    siding,
    roof,
    flooring,
    estimate,
    sidingColor: getColor(selections.sidingColorId),
    trimColor: getColor(selections.trimColorId),
    roofColor: getColor(selections.roofColorId),
    shutterColor: getColor(selections.shutterColorId),
    doorLabel: DOOR_LABELS[selections.doorStyle],
    brand: CATALOG.brand,
    specs: [
      { label: "Style", value: style.productTitle },
      {
        label: "Size",
        value: `${selections.width}×${selections.length} ft`,
      },
      { label: "Height", value: `${selections.height} ft` },
      { label: "Siding", value: siding.label },
      { label: "Roof", value: roof.label },
      { label: "Siding color", value: getColor(selections.sidingColorId).label },
      { label: "Trim color", value: getColor(selections.trimColorId).label },
      { label: "Roof color", value: getColor(selections.roofColorId).label },
      {
        label: "Shutter color",
        value: getColor(selections.shutterColorId).label,
      },
      { label: "Flooring", value: flooring.label },
      { label: "Loft", value: selections.hasLoft ? "Yes" : "No" },
      { label: "Window", value: selections.hasWindow ? "Yes" : "No" },
      { label: "Vent", value: selections.hasVent ? "Yes" : "No" },
      { label: "Door", value: DOOR_LABELS[selections.doorStyle] },
      { label: "Door wall", value: selections.wallFace },
      { label: "Delivery ZIP", value: selections.zip },
    ],
  };
}

export function openingSms(
  fullName: string,
  selections: QuoteSelections,
): string {
  const firstName = fullName.trim().split(/\s+/)[0] || "there";
  const { style, estimate } = describeSelections(selections);
  const total = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(estimate.total);

  const agent = process.env.COMPANY_CONTACT_NAME?.trim() || "Daniel";
  const company = CATALOG.brand.name;

  return `Hey ${firstName}, ${agent} from ${company} here. We just received a quote for a ${selections.width}-by-${selections.length} ${style.productTitle}, which comes out to about ${total}. When are you looking to get this done? Trying to get a bit more context so we can send the contract over.`;
}
