import { reviewMessageToken } from "@/src/features/crm/conversations/utils/formatting";

export type ReviewMessageValues = {
  firstName: string;
  lastName: string;
  dealName: string;
  dealPrice: string;
  quoteLink: string;
};

export function customerNameParts(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

export function fillReviewMessage(template: string, values: ReviewMessageValues): string {
  return template
    .replaceAll(reviewMessageToken.firstName, values.firstName)
    .replaceAll(reviewMessageToken.lastName, values.lastName)
    .replaceAll(reviewMessageToken.dealName, values.dealName)
    .replaceAll(reviewMessageToken.dealPrice, values.dealPrice)
    .replaceAll(reviewMessageToken.quoteLink, values.quoteLink);
}

export function reviewMessageValues(
  fullName: string,
  dealName: string,
  dealPrice: string,
  quoteLink: string,
): ReviewMessageValues {
  const name = customerNameParts(fullName);
  return {
    firstName: name.firstName,
    lastName: name.lastName,
    dealName,
    dealPrice,
    quoteLink,
  };
}

export function quoteRevisionPath(quoteId: string, revisionId: string): string {
  return `/quote/${quoteId}?revision=${encodeURIComponent(revisionId)}`;
}

export function emailHtml(text: string): string {
  const escaped = text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\n", "<br>");
  return `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#1a1c1d">${escaped}</div>`;
}
