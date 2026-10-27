import { dealNameMaxLength } from "@/src/features/crm/deals/types";

const sourceLabels: Record<string, string> = {
  quote: "Web Inquiry",
  yard_preview: "Yard Preview",
  lot_visit: "Lot Visit",
  lot_visitor: "Lot Visit",
  phone: "Phone Inquiry",
  phone_call: "Phone Inquiry",
};

const dealStamp = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export function dealSourceLabel(source: string): string {
  return (
    sourceLabels[source] ??
    source
      .split("_")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

function dealStampText(createdAt: string | Date): string {
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return dealStamp.format(date).replace(/[\u202f\u00a0]/g, " ");
}

export function defaultDealName(source: string, createdAt: string | Date, number = 1): string {
  const stamp = dealStampText(createdAt);
  const detail = stamp ? `${dealSourceLabel(source)} - ${stamp}` : dealSourceLabel(source);
  const count = Number.isInteger(number) && number > 0 ? number : 1;
  return `Deal ${count} (${detail})`.slice(0, dealNameMaxLength);
}
