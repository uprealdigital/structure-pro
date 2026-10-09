import { specValue } from "@/src/features/crm/common/utils/formatting";

export function dealProductName(specs: { label: string; value: string }[]): string {
  const style = specValue(specs, "Style");
  const size = specValue(specs, "Size").replace(/\s*ft$/i, "");
  if (style && size) return `${style} ${size}`;
  return style || size;
}

export function dealDetailLine(specs: { label: string; value: string }[]): string {
  const siding = specValue(specs, "Siding");
  const zip = specValue(specs, "Delivery ZIP");
  return [siding, zip ? `ZIP ${zip}` : ""].filter(Boolean).join(" • ");
}
