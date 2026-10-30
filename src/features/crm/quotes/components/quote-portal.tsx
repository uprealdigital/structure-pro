"use client";

import { Calendar, Check, CreditCard, Download, Eye, Share2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Toast } from "@/src/common/components/toast";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BuildingConfigurator } from "@/src/features/cpq/components/building-configurator";
import type { QuoteRevisionRenderFiles } from "@/src/features/cpq/components/building-scene";
import type { QuoteSelections } from "@/src/features/cpq/types";
import { CustomerPills, type CustomerPill } from "@/src/features/crm/common/components/customer-pills";
import { QuoteStatusActions } from "@/src/features/crm/conversations/components/quote-status-actions";
import { ReviewSendModal } from "@/src/features/crm/conversations/components/review-send-modal";
import type { ConversationParticipant } from "@/src/features/crm/conversations/types";
import { usePayDeposit } from "@/src/features/crm/quotes/hooks/use-pay-deposit";
import { useSaveQuoteRevision } from "@/src/features/crm/quotes/hooks/use-save-quote-revision";
import { useSendQuote } from "@/src/features/crm/quotes/hooks/use-send-quote";
import { quoteStatuses, type QuoteStatusActionId } from "@/src/features/crm/quotes/config/status";
import { QuoteStatusBadge } from "@/src/features/crm/quotes/components/quote-status-badge";
import { QuoteUpdatePill } from "@/src/features/crm/quotes/components/quote-update-pill";
import { useQuoteStream } from "@/src/features/crm/quotes/hooks/use-quote-stream";
import { reportCrmIssue } from "@/src/features/crm/common/server/actions";
import { portalCopy } from "@/src/features/crm/quotes/locales/en";
import { formatQuoteDateTime } from "@/src/features/crm/quotes/utils/formatting";
import {
  duplicateQuote,
  loadQuotePortal,
  refreshQuoteLifecycle,
  renewQuote,
  saveQuoteCommunication,
  signQuoteAgreement,
} from "@/src/features/crm/quotes/server/actions";
import type { QuoteChangeEvent, QuoteCommunication, QuotePortal, QuotePortalMode } from "@/src/features/crm/quotes/types";
import { downloadQuotePdf, shareQuotePdf, type QuotePdfKind } from "@/src/features/crm/quotes/utils/quote-pdf";

const actionClass =
  "inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#c5c6c9] px-3.5 py-1.5 text-xs font-medium text-[#1a1c1d] transition-colors hover:bg-[#eeeef0]";

const primaryCtaClass =
  "flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-black px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1b1c1d] disabled:cursor-default disabled:opacity-60";

const secondaryCtaClass =
  "flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#c5c6c9] bg-white px-6 py-3 text-sm font-semibold text-[#1a1c1d] transition-colors hover:bg-[#f3f3f5]";

function customerQuotePath(id: string) {
  return `/quote/${id}`;
}

function ReceiptCheck() {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
      <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
    </span>
  );
}

function QuoteReceipts({
  paid,
  confirmedLabel,
  onDownloadAgreement,
}: {
  paid: boolean;
  confirmedLabel: string;
  onDownloadAgreement: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-[#e8e8ea] pb-4">
      {paid ? (
        <div className="flex items-start gap-3">
          <ReceiptCheck />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#1a1c1d]">{portalCopy.depositReceipt}</p>
            <p className="mt-0.5 text-xs font-medium text-[#44474a]">{portalCopy.orderConfirmed}</p>
            {confirmedLabel ? <p className="mt-0.5 text-xs text-[#655d55]">{confirmedLabel}</p> : null}
            <p className="mt-1 text-xs leading-relaxed text-[#655d55]">{portalCopy.depositConfirmed}</p>
          </div>
        </div>
      ) : null}
      <div className="flex items-start gap-3">
        <ReceiptCheck />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#1a1c1d]">{portalCopy.agreementSigned}</p>
          {paid ? null : (
            <button
              type="button"
              onClick={onDownloadAgreement}
              className="mt-1 cursor-pointer text-xs font-medium text-[#1a1c1d] underline"
            >
              {portalCopy.downloadAgreement}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function QuotePortal({
  quote: initialQuote,
  mode = "external",
}: {
  quote: QuotePortal;
  mode?: QuotePortalMode;
}) {
  const router = useRouter();
  const [quote, setQuote] = useState(initialQuote);
  const quoteRef = useRef(quote);
  const incomingRef = useRef(initialQuote);
  const suppressRemote = useRef(false);
  const heldRemote = useRef<QuoteChangeEvent | null>(null);
  quoteRef.current = quote;
  incomingRef.current = initialQuote;
  const internal = mode === "internal";
  const { pending, error, pay } = usePayDeposit(quote.id, quote.won);
  const { save } = useSaveQuoteRevision(quote.id);
  const { send } = useSendQuote({
    quoteId: quote.id,
    revisionId: quote.revisionId,
    dealIds: quote.dealIds,
    dealName: quote.dealName,
    dealPrice: quote.totalLabel,
    quoteName: quote.dealName,
  });
  const [editing, setEditing] = useState(false);
  const [signing, setSigning] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  const dealId = quote.dealIds[0];

  function showError(message: string) {
    setToast({ id: Date.now(), message });
  }

  function replaceQuote(next: QuotePortal) {
    quoteRef.current = next;
    setQuote(next);
    setUpdateReady(false);
  }

  function noteRemote(event: QuoteChangeEvent) {
    const current = quoteRef.current;
    if (event.id !== current.id || event.kind === "delete") return;
    const statusChanged = event.status != null && event.status !== current.status;
    const revisionChanged = typeof event.activeRevisionId === "string" && event.activeRevisionId !== current.revisionId;
    if (statusChanged || revisionChanged) setUpdateReady(true);
  }

  function releaseLocalWrite() {
    suppressRemote.current = false;
    const held = heldRemote.current;
    heldRemote.current = null;
    if (held) noteRemote(held);
  }

  useEffect(() => {
    const next = incomingRef.current;
    quoteRef.current = next;
    setQuote(next);
    setUpdateReady(false);
  }, [initialQuote.id]);

  useEffect(() => {
    setSigning(false);
  }, [quote.status]);

  useEffect(() => {
    const current = quoteRef.current;
    if (current.status !== "sent" && current.status !== "viewed" && current.status !== "changes_requested") return;
    let cancelled = false;
    suppressRemote.current = true;
    void refreshQuoteLifecycle({ quoteId: current.id, openedByCustomer: !internal })
      .then((result) => {
        if (cancelled) return;
        if (!("error" in result) && result.data.status !== quoteRef.current.status) {
          replaceQuote({ ...quoteRef.current, status: result.data.status });
        }
      })
      .finally(() => {
        if (!cancelled) releaseLocalWrite();
      });
    return () => {
      cancelled = true;
    };
  }, [internal, quote.id, quote.status]);

  useQuoteStream((event) => {
    if (suppressRemote.current) {
      heldRemote.current = event;
      return;
    }
    noteRemote(event);
  }, quote.id);

  useEffect(() => {
    if (!shareOpen) return;
    function onPointer(event: MouseEvent) {
      if (!shareRef.current?.contains(event.target as Node)) setShareOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [shareOpen]);

  useEffect(() => {
    if (!error) return;
    setToast({ id: Date.now(), message: error });
  }, [error]);

  const updatePill = updateReady ? (
    <QuoteUpdatePill pending={loadingLatest} onView={() => void viewLatest()} />
  ) : null;
  const depositPaid = quote.won || quote.status === "deposit_paid";
  const agreementSigned = depositPaid || quote.status === "signed";

  const participants: ConversationParticipant[] = quote.recipients.map((recipient) => ({
    dealId: recipient.dealId,
    isPrimary: recipient.isPrimary,
    customer: recipient.customer,
  }));
  const people = new Map<string, CustomerPill>();
  for (const recipient of quote.recipients) {
    const existing = people.get(recipient.customer.id);
    if (existing) {
      if (recipient.isPrimary) existing.primary = true;
      continue;
    }
    people.set(recipient.customer.id, {
      id: recipient.customer.id,
      fullName: recipient.customer.fullName,
      phone: recipient.customer.phone,
      email: recipient.customer.email,
      primary: recipient.isPrimary,
    });
  }

  async function saveRevision(selections: QuoteSelections, renders: QuoteRevisionRenderFiles) {
    suppressRemote.current = true;
    try {
      await save(selections, renders);
      const loaded = await loadQuotePortal({ quoteId: quoteRef.current.id });
      if ("error" in loaded) throw new Error(loaded.error);
      replaceQuote(loaded.data);
      setEditing(false);
    } finally {
      releaseLocalWrite();
    }
  }

  async function viewLatest() {
    if (loadingLatest) return;
    setLoadingLatest(true);
    suppressRemote.current = true;
    try {
      const loaded = await loadQuotePortal({ quoteId: quoteRef.current.id });
      if ("error" in loaded) {
        showError(loaded.error || portalCopy.actionError);
        return;
      }
      setEditing(false);
      replaceQuote(loaded.data);
    } finally {
      setLoadingLatest(false);
      releaseLocalWrite();
    }
  }

  async function saveCommunication(communication: QuoteCommunication) {
    const result = await saveQuoteCommunication({ revisionId: quote.revisionId, communication });
    if ("error" in result) throw new Error(result.error);
  }

  async function copyQuote() {
    if (!dealId || actionPending) return;
    setActionPending(true);
    const result = await duplicateQuote({ dealId, quoteId: quote.id, revisionId: quote.revisionId });
    setActionPending(false);
    if ("error" in result) {
      showError(portalCopy.actionError);
      return;
    }
    router.push(`/quote/${result.data.id}?mode=internal`);
  }

  async function renew() {
    if (actionPending) return;
    setActionPending(true);
    suppressRemote.current = true;
    try {
      const result = await renewQuote({ quoteId: quoteRef.current.id });
      if ("error" in result) {
        showError(portalCopy.actionError);
        return;
      }
      const loaded = await loadQuotePortal({ quoteId: quoteRef.current.id });
      if ("error" in loaded) {
        showError(loaded.error || portalCopy.actionError);
        return;
      }
      replaceQuote(loaded.data);
      setReviewOpen(true);
    } finally {
      setActionPending(false);
      releaseLocalWrite();
    }
  }

  function runStatusAction(id: QuoteStatusActionId) {
    if (id === "send" || id === "resend") {
      setReviewOpen(true);
      return;
    }
    if (id === "edit") {
      setEditing((open) => !open);
      return;
    }
    if (id === "view_requested_changes") {
      document.getElementById("quote-summary")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (id === "collect_deposit") {
      showError(portalCopy.collectDepositUnavailable);
      return;
    }
    if (id === "view_signed_quote" || id === "view_deposit_receipt") {
      window.open(customerQuotePath(quote.id), "_blank", "noopener,noreferrer");
      return;
    }
    if (id === "renew") {
      void renew();
      return;
    }
    if (id === "copy") void copyQuote();
  }

  async function payDeposit() {
    suppressRemote.current = true;
    try {
      const paid = await pay();
      if (paid) {
        replaceQuote({
          ...quoteRef.current,
          status: "deposit_paid",
          won: true,
          confirmedAt: new Date().toISOString(),
        });
      }
    } finally {
      releaseLocalWrite();
    }
  }

  async function sendQuote(communication: QuoteCommunication) {
    suppressRemote.current = true;
    try {
      await send(communication);
      const loaded = await loadQuotePortal({ quoteId: quoteRef.current.id });
      if ("error" in loaded) throw new Error(loaded.error);
      replaceQuote(loaded.data);
    } finally {
      releaseLocalWrite();
    }
  }

  async function signAgreement() {
    if (signing) return;
    setSigning(true);
    suppressRemote.current = true;
    try {
      const result = await signQuoteAgreement({ quoteId: quoteRef.current.id });
      if ("error" in result) {
        showError(result.error || portalCopy.signError);
        setSigning(false);
        return;
      }
      replaceQuote({ ...quoteRef.current, status: result.data.status });
    } finally {
      releaseLocalWrite();
    }
  }

  function onDownload(kind: QuotePdfKind = "quote") {
    try {
      downloadQuotePdf(quote, kind);
    } catch (error) {
      void reportCrmIssue("quotes", error instanceof Error ? error.message : portalCopy.pdfError);
      showError(portalCopy.pdfError);
    }
  }

  async function onSharePdf() {
    setShareOpen(false);
    try {
      await shareQuotePdf(quote);
    } catch (shareFailure) {
      if (shareFailure instanceof DOMException && shareFailure.name === "AbortError") return;
      void reportCrmIssue("quotes", shareFailure instanceof Error ? shareFailure.message : portalCopy.shareError);
      showError(portalCopy.shareError);
    }
  }

  async function onCopyLink() {
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
        void reportCrmIssue("quotes", portalCopy.shareError);
        showError(portalCopy.shareError);
        return;
      }
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#f9f9fb] text-[#1a1c1d]">
      {updatePill}
      <header className="shrink-0 border-b border-[#e2e2e4] bg-white py-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start lg:gap-6">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-[#1a1c1d] lg:text-3xl">
              {quote.dealName}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              {internal ? (
                <QuoteStatusBadge status={quote.status} />
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
            {copied && !shareOpen ? <p className="text-xs text-[#44474a]">{portalCopy.linkCopied}</p> : null}
          </div>
          </div>
          {internal ? <CustomerPills people={[...people.values()]} /> : null}
        </div>
      </header>

      {editing ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <BuildingConfigurator
            key={quote.revisionId}
            mode="internal"
            selections={quote.selections}
            onSave={saveRevision}
            onCancel={() => setEditing(false)}
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
              <div id="quote-summary" className="flex flex-col gap-5 rounded-xl border border-[#e8e8ea] bg-white p-6 shadow-md">
                {!internal && agreementSigned ? (
                  <QuoteReceipts
                    paid={depositPaid}
                    confirmedLabel={formatQuoteDateTime(quote.confirmedAt)}
                    onDownloadAgreement={() => onDownload("agreement")}
                  />
                ) : null}
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
                  <div className="flex flex-col gap-2">
                    <div className="flex items-stretch gap-3">
                      <QuoteStatusActions
                        status={quote.status}
                        editing={editing}
                        disabled={actionPending}
                        size="card"
                        onAction={runStatusAction}
                      />
                    </div>
                  </div>
                ) : depositPaid ? (
                  <div className="flex flex-col gap-2">
                    <button type="button" onClick={() => onDownload("agreement")} className={primaryCtaClass}>
                      <Download className="h-4 w-4" aria-hidden="true" />
                      {portalCopy.downloadAgreement}
                    </button>
                    <button type="button" onClick={() => onDownload("receipt")} className={secondaryCtaClass}>
                      <Download className="h-4 w-4" aria-hidden="true" />
                      {portalCopy.downloadReceipt}
                    </button>
                  </div>
                ) : quote.status === "signed" ? (
                  <div className="flex flex-col items-center gap-3">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void payDeposit()}
                      className={primaryCtaClass}
                    >
                      <CreditCard className="h-4 w-4" aria-hidden="true" />
                      {pending ? portalCopy.paying : portalCopy.payDeposit}
                    </button>
                  </div>
                ) : quote.status === "sent" || quote.status === "viewed" ? (
                  <div className="flex flex-col items-center gap-2">
                    <button
                      type="button"
                      disabled={signing}
                      onClick={() => void signAgreement()}
                      className={primaryCtaClass}
                    >
                      {portalCopy.reviewAndSign}
                    </button>
                    <p className="text-center text-xs text-[#655d55]">{portalCopy.noPaymentToday}</p>
                  </div>
                ) : null}
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

      {toast ? (
        <Toast
          key={toast.id}
          message={toast.message}
          tone="error"
          dismissLabel={portalCopy.dismiss}
          onDismiss={() => setToast(null)}
        />
      ) : null}
      {reviewOpen ? (
        <ReviewSendModal
          participants={participants}
          title={quote.dealName}
          priceLabel={quote.totalLabel}
          quoteId={quote.id}
          revisionId={quote.revisionId}
          imageUrl={quote.renders?.render_small_url || quote.imageUrl}
          statusLabel={quoteStatuses[quote.status].label}
          communication={quote.communication}
          onSave={saveCommunication}
          onSend={sendQuote}
          onClose={() => setReviewOpen(false)}
        />
      ) : null}
    </main>
  );
}
