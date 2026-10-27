import { specValue } from "@/src/features/crm/common/utils/formatting";
import { copy } from "@/src/features/crm/conversations/locales/en";
import type { Activity } from "@/src/features/crm/conversations/types";
import { fileAttachment, imageAttachment } from "@/src/features/crm/conversations/utils/attachments";
import { parseEmailActivity } from "@/src/features/crm/conversations/utils/email-message";

export function quoteMenuName(index: number): string {
  return `${copy.quote} ${index + 1}`;
}

export function revisionMenuLabel(revisionNumber: number): string {
  return `${copy.revision} ${revisionNumber}`;
}

function savedRevisionName(name: string): string {
  const trimmed = name.trim();
  const prefix = `${copy.revision} `;
  if (trimmed.startsWith(prefix)) return trimmed;
  return `${prefix}${trimmed}`;
}

export function messagePreview(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function formatCallDuration(seconds: number | undefined): string {
  if (seconds == null || seconds < 0) return "";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes === 0) return `${rest}s`;
  return `${minutes}m ${rest}s`;
}

const messageChannels = new Set<Activity["channel"]>(["sms", "facebook", "email", "telegram"]);

export function messageActivityAt(activity: Activity): string | undefined {
  if (!messageChannels.has(activity.channel) || !activity.createdAt) return undefined;
  return activity.createdAt;
}

export function unreadActivityCount(activities: Activity[]): number {
  return activities.reduce((count, activity) => count + (activity.read ? 0 : 1), 0);
}

export function hasUnreadActivity(activities: Activity[]): boolean {
  return unreadActivityCount(activities) > 0;
}

export function lastMessageAt(activities: Activity[]): string {
  let latest = "";
  let latestMs = Number.NEGATIVE_INFINITY;
  for (const activity of activities) {
    if (!messageChannels.has(activity.channel) || !activity.createdAt) continue;
    const ms = new Date(activity.createdAt).getTime();
    if (Number.isNaN(ms) || ms < latestMs) continue;
    latest = activity.createdAt;
    latestMs = ms;
  }
  return latest;
}

const quoteSystemPrefix = "quote:";
const savedRevisionPrefix = "saved-revision:";
const activeQuotePrefix = "active-quote:";
const createdDealPrefix = "deal-created:";
const dealStatusPrefix = "deal-status:";
const quoteStatusPrefix = "quote-status:";
const renamedDealPrefix = "deal-renamed:";

export type SystemEventKind =
  | "deal"
  | "quote"
  | "activeQuote"
  | "created"
  | "dealStatus"
  | "quoteStatus"
  | "renamed"
  | "savedRevision";

export type SystemEvent = {
  kind: SystemEventKind;
  label: string;
  name: string;
  previousName?: string;
  dealId?: string;
  status?: string;
};

function decodedName(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function systemEventBody(
  kind: SystemEventKind,
  name: string,
  dealId?: string,
  previousName?: string,
): string {
  if (kind === "activeQuote") return `${activeQuotePrefix}${name}`;
  if (kind === "quote" && previousName) {
    return `${quoteSystemPrefix}${encodeURIComponent(previousName)}:${encodeURIComponent(name)}`;
  }
  if (kind === "quote") return `${quoteSystemPrefix}${name}`;
  if (kind === "savedRevision" && previousName) {
    return `${savedRevisionPrefix}${encodeURIComponent(previousName)}:${encodeURIComponent(name)}`;
  }
  if (kind === "created" && dealId) return `${createdDealPrefix}${dealId}:${name}`;
  if (kind === "renamed" && previousName) {
    return `${renamedDealPrefix}${encodeURIComponent(previousName)}:${encodeURIComponent(name)}`;
  }
  return name;
}

export function statusEventBody(kind: "dealStatus" | "quoteStatus", name: string, status: string): string {
  const prefix = kind === "dealStatus" ? dealStatusPrefix : quoteStatusPrefix;
  return `${prefix}${encodeURIComponent(name)}:${encodeURIComponent(status)}`;
}

function statusEvent(kind: "dealStatus" | "quoteStatus", rest: string): SystemEvent | undefined {
  const split = rest.indexOf(":");
  if (split <= 0) return undefined;
  const name = decodedName(rest.slice(0, split));
  const status = decodedName(rest.slice(split + 1));
  if (!name || !status) return undefined;
  return { kind, label: copy.statusSetTo, name, status };
}

export function systemEventText(text: string): SystemEvent {
  if (text.startsWith(renamedDealPrefix)) {
    const rest = text.slice(renamedDealPrefix.length);
    const split = rest.indexOf(":");
    if (split > 0) {
      const previousName = decodedName(rest.slice(0, split));
      const name = decodedName(rest.slice(split + 1));
      if (previousName && name) {
        return { kind: "renamed", label: copy.dealWasRenamedFrom, previousName, name };
      }
    }
  }
  if (text.startsWith(dealStatusPrefix)) {
    const event = statusEvent("dealStatus", text.slice(dealStatusPrefix.length));
    if (event) return event;
  }
  if (text.startsWith(quoteStatusPrefix)) {
    const event = statusEvent("quoteStatus", text.slice(quoteStatusPrefix.length));
    if (event) return event;
  }
  if (text.startsWith(createdDealPrefix)) {
    const rest = text.slice(createdDealPrefix.length);
    const split = rest.indexOf(":");
    if (split > 0) {
      return {
        kind: "created",
        label: copy.createdDeal,
        dealId: rest.slice(0, split),
        name: rest.slice(split + 1),
      };
    }
  }
  if (text.startsWith(activeQuotePrefix)) {
    return {
      kind: "activeQuote",
      label: copy.activeQuoteChangedTo,
      name: text.slice(activeQuotePrefix.length),
    };
  }
  if (text.startsWith(savedRevisionPrefix)) {
    const rest = text.slice(savedRevisionPrefix.length);
    const split = rest.indexOf(":");
    if (split > 0) {
      const quoteName = decodedName(rest.slice(0, split));
      const revisionName = decodedName(rest.slice(split + 1));
      if (quoteName && revisionName) {
        return {
          kind: "savedRevision",
          label: copy.newRevision,
          previousName: quoteName,
          name: savedRevisionName(revisionName),
        };
      }
    }
  }
  if (text.startsWith(quoteSystemPrefix)) {
    const rest = text.slice(quoteSystemPrefix.length);
    const split = rest.indexOf(":");
    if (split > 0) {
      const quoteName = decodedName(rest.slice(0, split));
      const revisionName = decodedName(rest.slice(split + 1));
      if (quoteName && revisionName) {
        return { kind: "quote", label: copy.revisionSwitchedTo, previousName: quoteName, name: revisionName };
      }
    }
    const legacy = rest.lastIndexOf(" on ");
    const quoteName = legacy > 0 ? rest.slice(legacy + 4) : "";
    const revisionName = legacy > 0 ? rest.slice(0, legacy) : "";
    if (quoteName.startsWith(`${copy.quote} `) && revisionName.startsWith(`${copy.revision} `)) {
      return { kind: "quote", label: copy.revisionSwitchedTo, previousName: quoteName, name: revisionName };
    }
    return { kind: "quote", label: copy.activeQuoteSwitchedTo, name: rest };
  }
  return { kind: "deal", label: copy.activeDealSwitchedTo, name: text };
}

export function activityPreview(activity: Activity | undefined): string {
  if (!activity) return "";
  if (activity.channel === "system") {
    const event = systemEventText(activity.text);
    const name = messagePreview(event.name);
    if (event.kind === "renamed" && event.previousName) {
      return `${event.label} ${messagePreview(event.previousName)} ${copy.dealWasRenamedTo} ${name}`;
    }
    if (event.kind === "quote" && event.previousName) {
      return `${messagePreview(event.previousName)} ${copy.revisionSwitchedTo} ${name}`;
    }
    if (event.kind === "savedRevision" && event.previousName) {
      return `${messagePreview(event.previousName)} ${name}`;
    }
    if ((event.kind === "dealStatus" || event.kind === "quoteStatus") && event.status) {
      return `${name} ${copy.statusSetTo} ${messagePreview(event.status)}`;
    }
    return name ? `${event.label} ${name}` : event.label;
  }
  if (activity.channel === "call") {
    const label =
      activity.call?.direction === "outbound"
        ? "Outbound call"
        : activity.call?.direction === "inbound"
          ? "Inbound call"
          : "Call";
    const duration = formatCallDuration(activity.call?.durationSeconds);
    const note = messagePreview(activity.text);
    const timed = duration ? `${label} (${duration})` : label;
    return note ? `Call Log: ${timed} - ${note}` : `Call Log: ${timed}`;
  }
  if (activity.channel === "email") {
    const email = parseEmailActivity(activity.text);
    const body = messagePreview(email.body);
    if (body) return body;
    if (email.subject) return messagePreview(email.subject);
    if (email.attachments.length > 0) return copy.attachmentsPreview(email.attachments.length);
  }
  const image = imageAttachment(activity.text);
  if (image) return messagePreview(image.name);
  const file = fileAttachment(activity.text);
  if (file) return messagePreview(file.name);
  return messagePreview(activity.text);
}

export function revisionSummary(specs: { label: string; value: string }[]): string {
  const siding = specValue(specs, "Siding");
  const roofColor = specValue(specs, "Roof color");
  const roof = specValue(specs, "Roof");
  const finish = [siding, roofColor || roof].filter(Boolean).join(" + ");
  return finish || specValue(specs, "Style");
}

export function revisionOptionsSummary(specs: { label: string; value: string }[]): string {
  return specs
    .filter((spec) => spec.value.trim())
    .map((spec) => `${spec.label}: ${spec.value}`)
    .join(", ");
}

export function formatUpdatedAgo(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return "";

  const minutes = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDealMenuDate(iso);
}

export function productTitle(specs: { label: string; value: string }[]): string {
  const style = specValue(specs, "Style");
  const size = specValue(specs, "Size");
  if (style && size) return `${style} (${size})`;
  return style || size;
}

export const reviewMessageToken = {
  firstName: "{{firstName}}",
  lastName: "{{lastName}}",
  dealName: "{{dealName}}",
  dealPrice: "{{dealPrice}}",
  quoteLink: "{{quoteLink}}",
  companyName: "{{companyName}}",
  userFirstName: "{{userFirstName}}",
  userLastName: "{{userLastName}}",
} as const;

export function reviewQuoteSubject(): string {
  const token = reviewMessageToken;
  return copy.reviewQuoteSubject(token.companyName, token.firstName, token.lastName, token.dealName);
}

export function reviewEmailBody(): string {
  const token = reviewMessageToken;
  return copy.reviewEmailBody(
    token.firstName,
    token.dealName,
    token.dealPrice,
    token.quoteLink,
    token.userFirstName,
    token.companyName,
  );
}

export function reviewSmsBody(): string {
  const token = reviewMessageToken;
  return copy.reviewSmsBody(
    token.firstName,
    token.userFirstName,
    token.companyName,
    token.dealName,
    token.dealPrice,
    token.quoteLink,
  );
}

export function dealSummarySentence(input: {
  source: "quote" | "yard_preview";
  style: string;
  size: string;
  siding: string;
  roof: string;
  door: string;
}): string {
  const product = [input.style, input.size ? `(${input.size})` : ""].filter(Boolean).join(" ");
  const finishes = [
    input.door && input.door !== "None" ? input.door : "",
    input.siding ? `${input.siding} siding` : "",
    input.roof ? `${input.roof} roof` : "",
  ].filter(Boolean);
  const interest = finishes.join(" and ");

  if (input.source === "yard_preview") {
    const aligned = product
      ? `Customer uploaded a yard photo and the AI aligned a ${product} on the site.`
      : "Customer uploaded a yard photo and the AI aligned the building on the site.";
    return interest ? `${aligned} Interested in ${interest}.` : aligned;
  }

  if (product && interest) return `Interested in a ${product} with ${interest}.`;
  if (product) return `Interested in a ${product}.`;
  return "Quote conversation.";
}

export function formatDealMenuDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatRevisionDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function formatConversationListTime(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  const startToday = startOfDay(now);
  const startDate = startOfDay(date);
  const dayMs = 24 * 60 * 60 * 1000;
  const daysAgo = Math.round((startToday.getTime() - startDate.getTime()) / dayMs);

  if (daysAgo === 0) return time;
  if (daysAgo === 1) return `${copy.yesterday}, ${time}`;
  if (daysAgo >= 2 && daysAgo <= 6) {
    return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  }).format(date);
}

export function formatDetailTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const day = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  return `${day} • ${time}`;
}

export function formatMessageClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatMessageDay(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const day = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
  }).format(date);
  if (date.toDateString() === now.toDateString()) return `Today, ${day}`;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
