import { specValue } from "@/src/features/crm/common/utils/formatting";
import { copy } from "@/src/features/crm/conversations/locales/en";
import type { Activity } from "@/src/features/crm/conversations/types";

export function revisionVersionLabel(status: "draft" | "sent", revisionNumber: number): string {
  const name = status === "sent" ? copy.sentStatus : copy.draftStatus;
  return `${name} ${copy.revisionVersion}${revisionNumber}`;
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

export function activityPreview(activity: Activity | undefined): string {
  if (!activity) return "";
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
  return messagePreview(activity.text);
}

export function revisionSummary(specs: { label: string; value: string }[]): string {
  const siding = specValue(specs, "Siding");
  const roofColor = specValue(specs, "Roof color");
  const roof = specValue(specs, "Roof");
  const finish = [siding, roofColor || roof].filter(Boolean).join(" + ");
  return finish || specValue(specs, "Style");
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

export function reviewQuoteSubject(invoiceId: string, title: string): string {
  return `TimberCraft Quote #${invoiceId} • ${title}`;
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
