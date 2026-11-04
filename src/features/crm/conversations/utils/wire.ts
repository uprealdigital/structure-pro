import type { Customer } from "@/src/features/crm/common/types";
import {
  activitySchema,
  conversationInboxItemSchema,
  conversationWorkspaceSchema,
  type Activity,
  type ConversationDetailWire,
  type ConversationInboxItem,
  type ConversationListItemWire,
  type ConversationWorkspace,
} from "@/src/features/crm/conversations/types";

function customerFromWire(wire: ConversationListItemWire["customer"]): Customer {
  return {
    id: wire.id,
    fullName: wire.full_name,
    phone: wire.phone,
    email: wire.email,
    optedOut: false,
  };
}

function activitiesFromWire(wires: ConversationDetailWire["activities"]): Activity[] {
  return wires.flatMap((wire) => {
    const parsed = activitySchema.safeParse({
      position: wire.position,
      role: wire.role,
      text: wire.body,
      channel: wire.channel,
      generatedBy: "manual",
      read: true,
      readAt: null,
      createdAt: wire.created_at,
    });
    return parsed.success ? [parsed.data] : [];
  });
}

export function inboxItemFromWire(wire: ConversationListItemWire): ConversationInboxItem | undefined {
  const parsed = conversationInboxItemSchema.safeParse({
    id: wire.id,
    updatedAt: wire.updated_at,
    preview: wire.activity?.body ?? "",
    contactName: wire.customer.full_name,
    contactPhone: wire.customer.phone,
    contactEmail: wire.customer.email,
    dealId: wire.deal.id,
    dealStatus: wire.deal.status,
    dealStatuses: [{ id: wire.deal.id, status: wire.deal.status }],
    dealSource: wire.deal.source,
    contractSent: false,
    unread: wire.unread_count > 0,
    unreadCount: wire.unread_count,
  });
  return parsed.success ? parsed.data : undefined;
}

export function workspaceFromWire(wire: ConversationDetailWire): ConversationWorkspace | undefined {
  const customer = customerFromWire(wire.customer);
  const activities = activitiesFromWire(wire.activities);
  const deal = {
    id: wire.deal.id,
    quoteId: wire.deal.quote?.id ?? "",
    source: wire.deal.source,
    status: wire.deal.status,
    previousStatus: null,
    name: wire.deal.name,
    viewedAt: null,
  };
  const option = {
    id: wire.deal.id,
    title: wire.deal.name?.trim() || "",
    priceLabel: "",
    stage: wire.deal.status,
    dateLabel: "",
    deal,
    quote: null,
    quotes: [],
    conversationId: wire.id,
    activities: [],
  };
  const parsed = conversationWorkspaceSchema.safeParse({
    id: wire.id,
    contractSent: false,
    createdAt: wire.updated_at,
    customer,
    deal,
    deals: [option],
    participants: [{ dealId: wire.deal.id, isPrimary: true, conversationId: wire.id, customer }],
    activities,
    quote: null,
  });
  return parsed.success ? parsed.data : undefined;
}
