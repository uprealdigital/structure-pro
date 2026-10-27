import { copy } from "@/src/features/crm/quotes/locales/en";
import type { QuoteStatus } from "@/src/features/crm/quotes/types";

export const quotePriceWindowDays = 14;

export type QuoteStatusActionId =
  | "send"
  | "resend"
  | "edit"
  | "view_requested_changes"
  | "collect_deposit"
  | "view_signed_quote"
  | "view_deposit_receipt"
  | "renew"
  | "copy"
  | "delete_draft"
  | "void";

export type QuoteStatusAction = {
  id: QuoteStatusActionId;
  label: string;
  tone: "primary" | "secondary";
};

export type QuoteStatusInfo = {
  label: string;
  badgeClass: string;
  priority: number;
  actions: QuoteStatusAction[];
  menu?: QuoteStatusAction;
};

export const quoteStatuses: Record<QuoteStatus, QuoteStatusInfo> = {
  draft: {
    label: copy.statusDraft,
    badgeClass: "bg-gray-100 text-gray-600",
    priority: 40,
    actions: [
      { id: "send", label: copy.actionSend, tone: "primary" },
      { id: "edit", label: copy.actionEdit, tone: "secondary" },
    ],
    menu: { id: "delete_draft", label: copy.actionDeleteDraft, tone: "secondary" },
  },
  sent: {
    label: copy.statusSent,
    badgeClass: "bg-blue-50 text-blue-600",
    priority: 50,
    actions: [
      { id: "resend", label: copy.actionResend, tone: "primary" },
      { id: "edit", label: copy.actionEdit, tone: "secondary" },
    ],
    menu: { id: "void", label: copy.actionVoid, tone: "secondary" },
  },
  viewed: {
    label: copy.statusViewed,
    badgeClass: "bg-violet-50 text-violet-700",
    priority: 60,
    actions: [
      { id: "resend", label: copy.actionResend, tone: "primary" },
      { id: "edit", label: copy.actionEdit, tone: "secondary" },
    ],
    menu: { id: "void", label: copy.actionVoid, tone: "secondary" },
  },
  changes_requested: {
    label: copy.statusChangesRequested,
    badgeClass: "bg-orange-50 text-orange-600",
    priority: 70,
    actions: [
      { id: "edit", label: copy.actionEdit, tone: "primary" },
      { id: "view_requested_changes", label: copy.actionViewRequestedChanges, tone: "secondary" },
    ],
    menu: { id: "void", label: copy.actionVoid, tone: "secondary" },
  },
  signed: {
    label: copy.statusSigned,
    badgeClass: "bg-amber-50 text-amber-700",
    priority: 80,
    actions: [
      { id: "collect_deposit", label: copy.actionCollectDeposit, tone: "primary" },
      { id: "view_signed_quote", label: copy.actionViewSignedQuote, tone: "secondary" },
    ],
    menu: { id: "void", label: copy.actionVoid, tone: "secondary" },
  },
  deposit_paid: {
    label: copy.statusDepositPaid,
    badgeClass: "bg-emerald-50 text-emerald-700",
    priority: 30,
    actions: [
      { id: "view_signed_quote", label: copy.actionViewSignedQuote, tone: "secondary" },
      { id: "view_deposit_receipt", label: copy.actionViewDepositReceipt, tone: "secondary" },
    ],
  },
  expired: {
    label: copy.statusExpired,
    badgeClass: "bg-stone-100 text-stone-600",
    priority: 20,
    actions: [
      { id: "renew", label: copy.actionRenew, tone: "primary" },
      { id: "edit", label: copy.actionEdit, tone: "secondary" },
    ],
  },
  voided: {
    label: copy.statusVoided,
    badgeClass: "bg-red-50 text-red-600",
    priority: 10,
    actions: [{ id: "copy", label: copy.actionCopy, tone: "secondary" }],
  },
};
