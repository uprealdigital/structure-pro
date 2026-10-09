import { specValue } from "@/src/features/crm/common/utils/formatting";

import type { Activity } from "@/src/features/crm/conversations/types";

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

export function productTitle(specs: { label: string; value: string }[]): string {
  const style = specValue(specs, "Style");
  const size = specValue(specs, "Size");
  if (style && size) return `${style} (${size})`;
  return style || size;
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

export function formatConversationTime(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const elapsed = now.getTime() - date.getTime();
  const minutes = Math.round(elapsed / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  if (date >= startOfToday) {
    const hours = Math.max(1, Math.round(elapsed / 3600000));
    return `${hours}h ago`;
  }

  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  if (date >= startOfYesterday) return "Yesterday";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
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
