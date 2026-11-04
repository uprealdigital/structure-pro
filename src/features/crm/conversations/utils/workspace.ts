import { dealSchema, type Deal } from "@/src/features/crm/deals/types";
import { customerSchema } from "@/src/features/crm/common/types";
import {
  conversationDealOptionSchema,
  conversationParticipantSchema,
  conversationWorkspaceSchema,
  type Activity,
  type ConversationDetail,
  type ConversationDetailPerson,
  type ConversationDetailQuote,
  type ConversationQuote,
  type ConversationWorkspace,
} from "@/src/features/crm/conversations/types";
import { toCall, toConversationQuote, toConversationQuoteRevision } from "@/src/features/crm/conversations/utils/mappers";
import { orderedDealParticipants } from "@/src/features/crm/conversations/utils/participants";
import { formatDealMenuDate, productTitle } from "@/src/features/crm/conversations/utils/formatting";

function conversationIdOf(person: ConversationDetailPerson): string | undefined {
  const link = person.conversations;
  if (!link) return undefined;
  return Array.isArray(link) ? link[0]?.id : link.id;
}

function quoteFromRow(row: ConversationDetailQuote | null): ConversationQuote | undefined {
  if (!row) return undefined;
  const revisions = row.quote_revisions.flatMap((revision) => {
    const mapped = toConversationQuoteRevision({
      id: revision.id,
      revisionNumber: revision.revision_number,
      status: revision.status,
      createdAt: revision.created_at,
      updatedAt: revision.updated_at,
      selections: revision.config,
      configChanges: revision.config_changes,
      communication: revision.communication,
      renders: revision.renders,
      sharedPhotosAt: revision.shared_photos_at,
      sharedQuoteAt: revision.shared_quote_at,
    });
    return mapped ? [mapped] : [];
  });
  const active =
    revisions.find((revision) => revision.id === row.active_revision_id) ?? revisions[revisions.length - 1];
  if (!active) return undefined;
  return toConversationQuote({
    id: row.id,
    invoiceId: row.invoice_id,
    quoteNumber: row.quote_number,
    totalLabel: active.totalLabel,
    specs: active.specs,
    lines: active.lines,
    imageUrl: active.imageUrl,
    selections: active.selections,
    activeRevisionId: active.id,
    status: row.status,
    revisions,
  });
}

function quotesForDeal(deal: ConversationDetail["customer"]["deal_customers"][number]["deal"]): ConversationQuote[] {
  const linked = deal.deal_quotes.flatMap((link) => {
    const quote = quoteFromRow(link.quote);
    return quote ? [quote] : [];
  });
  const primary = quoteFromRow(deal.quote);
  if (primary && !linked.some((quote) => quote.id === primary.id)) linked.unshift(primary);
  return linked;
}

function dealFrom(row: ConversationDetail["customer"]["deal_customers"][number]["deal"]): Deal | undefined {
  const deal = dealSchema.safeParse({
    id: row.id,
    quoteId: row.quote_id ?? "",
    source: row.source,
    status: row.status,
    previousStatus: row.previous_status,
    name: row.name,
    viewedAt: row.viewed_at,
    createdAt: row.created_at,
  });
  return deal.success ? deal.data : undefined;
}

function activityFrom(row: ConversationDetail["activities"][number]): Activity | undefined {
  const call = row.call
    ? toCall({
        id: row.call.id,
        direction: row.call.direction,
        duration_seconds: row.call.duration_seconds,
        script_match: row.call.script_match,
        recording_url: row.call.recording_url,
        transcript: row.call.transcript,
        external_id: row.call.external_id,
        started_at: row.call.started_at,
        ended_at: row.call.ended_at,
      })
    : undefined;
  return {
    position: row.position,
    role: row.role,
    text: row.body,
    channel: row.channel,
    generatedBy: row.generated_by,
    read: row.read_at != null,
    readAt: row.read_at,
    createdAt: row.created_at,
    ...(call ? { call } : {}),
  };
}

export function conversationWorkspace(
  detail: ConversationDetail,
  dealId?: string,
): ConversationWorkspace | undefined {
  const links = [...detail.customer.deal_customers].sort((left, right) =>
    right.deal.created_at.localeCompare(left.deal.created_at),
  );
  const options = links.flatMap((link) => {
    const deal = dealFrom(link.deal);
    if (!deal) return [];
    const quotes = quotesForDeal(link.deal);
    const quote = quotes.find((item) => item.id === deal.quoteId) ?? quotes[0] ?? null;
    const option = conversationDealOptionSchema.safeParse({
      id: deal.id,
      title: deal.name?.trim() || productTitle(quote?.specs ?? []) || quote?.invoiceId || "",
      priceLabel: quote?.totalLabel ?? "",
      stage: deal.status,
      dateLabel: formatDealMenuDate(deal.createdAt ?? ""),
      deal,
      quote,
      quotes,
      conversationId: detail.id,
    });
    return option.success ? [option.data] : [];
  });
  if (options.length === 0) return undefined;

  const primaryIds = new Set(links.filter((link) => link.is_primary).map((link) => link.deal.id));
  const focused =
    (dealId ? options.find((option) => option.id === dealId) : undefined) ??
    (detail.customer.active_deal_id
      ? options.find((option) => option.id === detail.customer.active_deal_id)
      : undefined) ??
    options.find((option) => primaryIds.has(option.id)) ??
    options[0];
  if (!focused) return undefined;

  const participants = orderedDealParticipants(
    links.flatMap((link) =>
      link.deal.deal_customers.flatMap((membership) => {
        const person = membership.customer;
        const conversationId = conversationIdOf(person);
        const participant = conversationParticipantSchema.safeParse({
          dealId: link.deal.id,
          isPrimary: membership.is_primary,
          ...(conversationId ? { conversationId } : {}),
          customer: {
            id: person.id,
            fullName: person.full_name,
            phone: person.phone,
            email: person.email,
            optedOut: person.opted_out,
            ...(person.active_deal_id ? { activeDealId: person.active_deal_id } : {}),
            createdAt: person.created_at,
          },
        });
        return participant.success ? [participant.data] : [];
      }),
    ),
  );

  const customer = customerSchema.safeParse({
    id: detail.customer.id,
    fullName: detail.customer.full_name,
    phone: detail.customer.phone,
    email: detail.customer.email,
    optedOut: detail.customer.opted_out,
    ...(detail.customer.active_deal_id ? { activeDealId: detail.customer.active_deal_id } : {}),
    createdAt: detail.customer.created_at,
  });
  if (!customer.success) return undefined;

  const activities = [...detail.activities]
    .sort((left, right) => left.position - right.position)
    .flatMap((row) => {
      const activity = activityFrom(row);
      return activity ? [activity] : [];
    });

  const workspace = conversationWorkspaceSchema.safeParse({
    id: detail.id,
    contractSent: detail.contract_sent,
    createdAt: detail.created_at,
    customer: customer.data,
    deal: focused.deal,
    deals: options,
    participants,
    activities,
    quote: focused.quote,
  });
  return workspace.success ? workspace.data : undefined;
}
