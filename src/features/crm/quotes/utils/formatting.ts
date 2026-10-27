import { specValue } from "@/src/features/crm/common/utils/formatting";
import { portalCopy } from "@/src/features/crm/quotes/locales/en";
import type { QuotePortalMode } from "@/src/features/crm/quotes/types";

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const priceFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const monthlyFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatQuoteDate(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return dateFormat.format(date);
}

export function formatQuotePrice(amount: number): string {
  return priceFormat.format(amount);
}

export function formatQuoteMonthly(amount: number): string {
  return `(${monthlyFormat.format(amount)}/mo)`;
}

const cashFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatQuoteCash(amount: number): string {
  return cashFormat.format(amount);
}

export function quoteVersionLabel(revisionNumber: number): string {
  return `Revision ${revisionNumber}`;
}

export function quotePortalMode(value: string | string[] | undefined): QuotePortalMode {
  const mode = Array.isArray(value) ? value[0] : value;
  return mode === "internal" ? "internal" : "external";
}

export function quoteMonthsLabel(months: number): string {
  return `for ${months} mos`;
}

export function quotePortalDealName(
  deals: { name: string | null }[],
  specs: { label: string; value: string }[],
  invoiceId: string,
): string {
  const name = deals.find((deal) => deal.name?.trim())?.name?.trim();
  return name || quoteDealLabel(specs) || invoiceId;
}

export function quoteNumberValue(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isInteger(number) && number > 0 ? number : undefined;
}

export function quoteDisplayName(quoteNumber: number, specs: { label: string; value: string }[]): string {
  const style = specValue(specs, "Style");
  const size = specValue(specs, "Size");
  const detail = [style, size].filter(Boolean).join(" — ");
  const prefix = `${portalCopy.quote} #${quoteNumber}`;
  return detail ? `${prefix} (${detail})` : prefix;
}

export function quoteDealLabel(specs: { label: string; value: string }[]): string {
  const style = specValue(specs, "Style");
  const size = specValue(specs, "Size");
  if (style && size) return `${style} ${size}`;
  return style || size;
}

export function quoteZip(specs: { label: string; value: string }[]): string {
  return specValue(specs, "Delivery ZIP");
}

export function quotePageNumbers(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 4) return Array.from({ length: total }, (_, index) => index + 1);
  if (current <= 3) return [1, 2, 3, "ellipsis", total];
  if (current >= total - 2) return [1, "ellipsis", total - 2, total - 1, total];
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}
