import type { DealSummaryRequest } from "@/src/features/ai/types";
import { dealStatuses } from "@/src/features/crm/deals/config/status";
import { dealSourceLabel } from "@/src/features/crm/deals/utils/naming";
import type { Deal } from "@/src/features/crm/deals/types";
import { quoteStatuses } from "@/src/features/crm/quotes/config/status";
import { quoteDisplayName } from "@/src/features/crm/quotes/utils/formatting";
import type { Activity, ConversationParticipant, ConversationQuote } from "@/src/features/crm/conversations/types";
import { activityPreview, quoteMenuName, revisionMenuLabel } from "@/src/features/crm/conversations/utils/formatting";

const historyLimit = 80;
const textLimit = 500;

function clip(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= textLimit) return trimmed;
  return `${trimmed.slice(0, textLimit).trimEnd()}…`;
}

function quoteName(quote: ConversationQuote, index: number): string {
  if (quote.quoteNumber) return quoteDisplayName(quote.quoteNumber, quote.specs);
  return quoteMenuName(index);
}

function activityText(activity: Activity): string {
  const preview = activityPreview(activity);
  const transcript = activity.call?.transcript?.trim();
  if (!transcript) return clip(preview);
  return clip(`${preview}\n${transcript}`);
}

function speaker(activity: Activity): string {
  if (activity.channel === "system") return "System";
  return activity.role === "user" ? "Customer" : "Salesperson";
}

export function dealSummarySnapshot(input: {
  deal: Deal;
  title: string;
  quotes: ConversationQuote[];
  participants: ConversationParticipant[];
  activities: Activity[];
}): { request: DealSummaryRequest; fingerprint: string } {
  const customers = [...input.participants]
    .sort((left, right) => left.customer.id.localeCompare(right.customer.id))
    .map((participant) => ({
      name: participant.customer.fullName,
      phone: participant.customer.phone,
      email: participant.customer.email,
      primary: participant.isPrimary,
    }));
  const quotes = [...input.quotes]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((quote, index) => ({
      name: quoteName(quote, index),
      status: quoteStatuses[quote.status].label,
      revisions: [...quote.revisions]
        .sort((left, right) => left.revisionNumber - right.revisionNumber)
        .map((revision) => ({
          name: revisionMenuLabel(revision.revisionNumber),
          status: quoteStatuses[revision.status].label,
          total: revision.totalLabel,
          summary: clip(revision.summary || revision.specs.map((spec) => `${spec.label}: ${spec.value}`).join(", ")),
          active: revision.id === quote.activeRevisionId,
        })),
    }));
  const history = [...input.activities].sort((left, right) => left.position - right.position);
  const shown = history.slice(-historyLimit);
  const request: DealSummaryRequest = {
    dealName: input.deal.name?.trim() || input.title.trim() || "Deal",
    status: dealStatuses[input.deal.status].label,
    source: dealSourceLabel(input.deal.source),
    customers: customers.slice(0, 20),
    quotes: quotes.slice(0, 20).map((quote) => ({ ...quote, revisions: quote.revisions.slice(0, 30) })),
    activities: shown.map((activity) => ({
      ...(activity.createdAt ? { at: activity.createdAt } : {}),
      channel: activity.channel,
      speaker: speaker(activity),
      text: activityText(activity),
    })),
    earlierActivityCount: Math.max(0, history.length - shown.length),
  };
  const fingerprint = JSON.stringify({
    id: input.deal.id,
    name: request.dealName,
    status: input.deal.status,
    source: input.deal.source,
    customers: customers.map((customer) => [customer.name, customer.phone, customer.email, customer.primary]),
    quotes: [...input.quotes]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((quote) => ({
        id: quote.id,
        status: quote.status,
        activeRevisionId: quote.activeRevisionId,
        revisions: [...quote.revisions]
          .sort((left, right) => left.revisionNumber - right.revisionNumber)
          .map((revision) => [
            revision.id,
            revision.revisionNumber,
            revision.status,
            revision.updatedAt,
            revision.totalLabel,
            revision.summary,
          ]),
      })),
    activities: history.map((activity) => [
      activity.position,
      activity.channel,
      activity.role,
      activity.text,
      activity.call?.transcript ?? "",
    ]),
  });
  return { request, fingerprint };
}
