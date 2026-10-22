"use client";

import { ArrowUpRight, Calendar, Check, CreditCard, Download, Eye, Pencil, Share2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BuildingConfigurator } from "@/src/features/cpq/components/building-configurator";
import type { QuoteRevisionRenderFiles } from "@/src/features/cpq/components/building-scene";
import type { QuoteSelections } from "@/src/features/cpq/types";
import { contactInitials } from "@/src/features/crm/common/utils/formatting";
import { ReviewSendModal } from "@/src/features/crm/conversations/components/review-send-modal";
import type { ConversationParticipant } from "@/src/features/crm/conversations/types";
import { usePayDeposit } from "@/src/features/crm/quotes/hooks/use-pay-deposit";
import { useSaveQuoteRevision } from "@/src/features/crm/quotes/hooks/use-save-quote-revision";
import { useSendQuote } from "@/src/features/crm/quotes/hooks/use-send-quote";
import { portalCopy } from "@/src/features/crm/quotes/locales/en";
import { saveQuoteCommunication } from "@/src/features/crm/quotes/server/actions";
import type { QuoteCommunication, QuotePortal, QuotePortalMode, QuotePortalStatus } from "@/src/features/crm/quotes/types";
import { downloadQuotePdf, shareQuotePdf } from "@/src/features/crm/quotes/utils/quote-pdf";

const statusLabel: Record<QuotePortalStatus, string> = {
  draft: portalCopy.statusDraft,
  sent: portalCopy.statusSent,
  viewed: portalCopy.statusViewed,
  signed: portalCopy.statusSigned,
  deposit_paid: portalCopy.statusDepositPaid,
  expired: portalCopy.statusExpired,
};

const statusClass: Record<QuotePortalStatus, string> = {
  draft: "border-gray-200 bg-gray-100 text-gray-700",
  sent: "border-[#fde68a] bg-[#fef9ee] text-[#713f12]",
  viewed: "border-violet-200 bg-violet-50 text-violet-700",
  signed: "border-amber-200 bg-amber-50 text-amber-800",
  deposit_paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  expired: "border-red-200 bg-red-50 text-red-600",
};

const actionClass =
  "inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#c5c6c9] px-3.5 py-1.5 text-xs font-medium text-[#1a1c1d] transition-colors hover:bg-[#eeeef0]";

function customerQuotePath(id: string) {
  return `/quote/${id}`;
}

function QuoteSuccess() {
  return (
    <main className="flex h-full min-h-0 min-w-0 flex-1 items-center justify-center overflow-y-auto bg-[#f9f9fb] px-6 py-16">
      <div className="w-full max-w-lg rounded-xl border border-[#e8e8ea] bg-white px-8 py-12 text-center shadow-md">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#f3f3f5] text-green-600">
          <Check className="h-12 w-12" strokeWidth={2.5} aria-hidden="true" />
        </div>
        <h1 className="mt-6 font-serif text-3xl font-semibold tracking-tight text-[#1a1c1d]">
          {portalCopy.successTitle}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#655d55]">{portalCopy.successBody}</p>
      </div>
    </main>
  );
}

export function QuotePortal({
  quote,
  mode = "external",
}: {
  quote: QuotePortal;
  mode?: QuotePortalMode;
}) {
  const internal = mode === "internal";
  const { won, pending, error, pay } = usePayDeposit(quote.id, quote.won);
  const { save } = useSaveQuoteRevision(quote.id);
  const { send } = useSendQuote({
    quoteId: quote.id,
    revisionId: quote.revisionId,
    dealIds: quote.dealIds,
    dealName: quote.dealName,
    dealPrice: quote.totalLabel,
  });
  const [editing, setEditing] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fileError, setFileError] = useState("");
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shareOpen) return;
    function onPointer(event: MouseEvent) {
      if (!shareRef.current?.contains(event.target as Node)) setShareOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [shareOpen]);

  if (!internal && won) return <QuoteSuccess />;

  const participants: ConversationParticipant[] = quote.recipients.map((recipient) => ({
    dealId: recipient.dealId,
    isPrimary: recipient.isPrimary,
    customer: recipient.customer,
  }));

  async function saveRevision(selections: QuoteSelections, renders: QuoteRevisionRenderFiles) {
    await save(selections, renders);
    setEditing(false);
  }

  async function saveCommunication(communication: QuoteCommunication) {
    const result = await saveQuoteCommunication({ revisionId: quote.revisionId, communication });
    if ("error" in result) throw new Error(result.error);
  }

  async function onDownload() {
    setFileError("");
    try {
      downloadQuotePdf(quote);
    } catch {
      setFileError(portalCopy.pdfError);
    }
  }

  async function onSharePdf() {
    setFileError("");
    setShareOpen(false);
    try {
      await shareQuotePdf(quote);
    } catch (shareFailure) {
      if (shareFailure instanceof DOMException && shareFailure.name === "AbortError") return;
      setFileError(portalCopy.shareError);
    }
  }

  async function onCopyLink() {
    setFileError("");
    const url = `${window.location.origin}${customerQuotePath(quote.id)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const field = document.createElement("textarea");
      field.value = url;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.left = "-9999px";
      document.body.appendChild(field);
      field.select();
      const copiedLink = document.execCommand("copy");
      field.remove();
      if (!copiedLink) {
        setFileError(portalCopy.shareError);
        return;
      }
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#f9f9fb] text-[#1a1c1d]">
      <header className="shrink-0 border-b border-[#e2e2e4] bg-white px-6 py-6 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 lg:flex-row lg:items-start lg:gap-6">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-[#1a1c1d] lg:text-3xl">
              {quote.dealName}
            </h1>
            {internal ? (
              <div className="flex flex-wrap items-center gap-3">
                {quote.customers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center gap-3 rounded-full border border-[#c5c6c9]/40 bg-white px-4 py-1 shadow-xs"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e8e8ea] text-xs font-semibold text-[#44474a]">
                      {contactInitials(customer.name)}
                    </div>
                    <span className="text-sm text-[#1a1c1d]">{customer.name}</span>
                    {customer.primary ? (
                      <span className="rounded-full bg-[#e2e8f0] px-2 py-0.5 text-[11px] font-medium text-[#475569]">
                        {portalCopy.primary}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              {internal ? (
                <span
                  className={`inline-flex items-center rounded border px-2.5 py-0.5 text-xs font-medium shadow-xs ${statusClass[quote.status]}`}
                >
                  {statusLabel[quote.status]}
                </span>
              ) : null}
              <p className="text-xs font-medium text-[#655d55]">{quote.versionLabel}</p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 lg:items-end">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative" ref={shareRef}>
                <button
                  type="button"
                  aria-expanded={shareOpen}
                  aria-haspopup="menu"
                  onClick={() => {
                    setCopied(false);
                    setShareOpen((open) => !open);
                  }}
                  className={actionClass}
                >
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                  {portalCopy.share}
                </button>
                {shareOpen ? (
                  <div
                    role="menu"
                    className="absolute top-full right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-[#e8e8ea] bg-white py-1 shadow-md"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void onSharePdf()}
                      className="flex w-full cursor-pointer px-3 py-2 text-left text-xs text-[#1a1c1d] hover:bg-[#f3f3f5]"
                    >
                      {portalCopy.sharePdf}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void onCopyLink()}
                      className="flex w-full cursor-pointer px-3 py-2 text-left text-xs text-[#1a1c1d] hover:bg-[#f3f3f5]"
                    >
                      {copied ? portalCopy.linkCopied : portalCopy.copyLink}
                    </button>
                  </div>
                ) : null}
              </div>
              <button type="button" onClick={() => void onDownload()} className={actionClass}>
                <Download className="h-4 w-4" aria-hidden="true" />
                {portalCopy.download}
              </button>
              {internal ? (
                <Link
                  href={`/quote/${quote.id}?mode=external`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={actionClass}
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  {portalCopy.viewAsCustomer}
                </Link>
              ) : null}
            </div>
            {quote.dateLabel ? (
              <p className="text-xs font-medium text-[#655d55]">{quote.dateLabel}</p>
            ) : null}
            {fileError ? <p className="text-xs text-red-600">{fileError}</p> : null}
          </div>
        </div>
      </header>

      {editing ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <BuildingConfigurator
            key={quote.revisionId}
            mode="internal"
            selections={quote.selections}
            onSave={saveRevision}
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <section className="mx-auto grid w-full max-w-7xl grid-cols-1 items-start gap-8 px-4 py-6 sm:px-6 lg:grid-cols-12 lg:px-10">
            <div className="flex min-h-[460px] items-center justify-center lg:col-span-7 lg:min-h-[520px]">
              <img
                src={quote.renders?.render_full_url || quote.imageUrl}
                alt={quote.dealName}
                className="max-h-[420px] w-auto max-w-full object-contain drop-shadow-2xl select-none"
              />
            </div>

            <div className="lg:col-span-5">
              <div className="flex flex-col gap-5 rounded-xl border border-[#e8e8ea] bg-white p-6 shadow-md">
                <h2 className="border-b border-[#e8e8ea] pb-4 font-serif text-base font-semibold text-[#1a1c1d]">
                  {portalCopy.quote}
                </h2>

                <p className="flex flex-wrap items-center gap-1.5 text-xs text-[#44474a]">
                  <span className="underline">{portalCopy.paymentOptions}</span>
                  <span>{portalCopy.fromAsLowAs}</span>
                  <span className="rounded border border-[#dca270] bg-[#fdf6e9] px-2 py-0.5 font-medium text-[#ad662b]">
                    {quote.monthlyLabel}
                  </span>
                  <span>{quote.monthsLabel}</span>
                </p>

                <div className="flex flex-col">
                  {quote.lines.map((line) => (
                    <div
                      key={line.label}
                      className="flex items-center justify-between gap-4 py-1.5 text-xs"
                    >
                      <span className="font-medium text-[#1a1c1d]">{line.label}</span>
                      <span className="font-mono font-semibold text-[#1a1c1d]">{line.amountLabel}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-[#e2e2e4] pt-2">
                  <span className="font-serif text-sm font-bold tracking-wider text-[#1a1c1d] uppercase">
                    {portalCopy.total}
                  </span>
                  <span className="font-mono text-3xl font-bold text-black lg:text-4xl">{quote.totalLabel}</span>
                </div>

                <div className="space-y-2 pt-1 text-[11px] leading-relaxed text-[#655d55]">
                  <p>{portalCopy.disclaimer}</p>
                  <p>{portalCopy.satisfaction}</p>
                </div>

                {internal ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#c5c6c9] bg-white px-4 py-3 text-sm font-medium text-[#1a1c1d] transition-colors hover:bg-[#f3f3f5]"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      {portalCopy.editQuote}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewOpen(true)}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1b1c1d]"
                    >
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      {portalCopy.reviewAndSend}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void pay()}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-black px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1b1c1d] disabled:cursor-default disabled:opacity-60"
                  >
                    <CreditCard className="h-4 w-4" aria-hidden="true" />
                    {pending ? portalCopy.paying : portalCopy.payDeposit}
                  </button>
                )}
                {!internal && error ? <p className="text-xs text-red-600">{error}</p> : null}

                <div className="flex flex-col gap-2 pt-1 text-xs text-[#655d55]">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      {portalCopy.deliveryTo}{" "}
                      <button type="button" className="font-medium text-[#1a1c1d] underline">
                        {quote.zip}
                      </button>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <button type="button" className="font-medium text-[#1a1c1d] underline">
                      {portalCopy.installation}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {reviewOpen ? (
        <ReviewSendModal
          participants={participants}
          title={quote.dealName}
          priceLabel={quote.totalLabel}
          quoteId={quote.id}
          revisionId={quote.revisionId}
          imageUrl={quote.renders?.render_small_url || quote.imageUrl}
          statusLabel={statusLabel[quote.status]}
          communication={quote.communication}
          onSave={saveCommunication}
          onSend={send}
          onClose={() => setReviewOpen(false)}
        />
      ) : null}
    </main>
  );
}
