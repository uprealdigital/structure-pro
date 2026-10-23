import { applyAssistantPrompt } from "@/src/features/cpq/utils/assistant";
import { formatUsd, priceSummary } from "@/src/features/cpq/utils/pricing";
import { quoteSelectionsSchema, type QuoteSelections } from "@/src/features/cpq/types";
import type { Activity } from "@/src/features/crm/conversations/types";

const inboundChannels = new Set<Activity["channel"]>(["sms", "telegram", "facebook", "email"]);

export type InboundMessageRef = {
  position: number;
  text: string;
};

export function customerInboundMessages(activities: Activity[]): InboundMessageRef[] {
  return activities
    .filter((activity) => activity.role === "user" && inboundChannels.has(activity.channel))
    .map((activity) => ({ position: activity.position, text: activity.text.trim() }))
    .filter((activity) => activity.text)
    .slice(-40);
}

export function proposedSelections(current: QuoteSelections, messages: string[]): QuoteSelections {
  const next = applyAssistantPrompt(current, messages.join("\n")).config;
  const parsed = quoteSelectionsSchema.safeParse({ ...current, ...next });
  return parsed.success ? parsed.data : current;
}

export function sameSelections(left: QuoteSelections, right: QuoteSelections): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function estimateDelta(before: number, after: number): string {
  const delta = after - before;
  const amount = formatUsd(Math.abs(delta));
  if (delta > 0) return `+${amount}`;
  if (delta < 0) return `-${amount}`;
  return amount;
}

export function selectionTotals(current: QuoteSelections, proposed: QuoteSelections) {
  const before = priceSummary(current);
  const after = priceSummary(proposed);
  return { before, after };
}
