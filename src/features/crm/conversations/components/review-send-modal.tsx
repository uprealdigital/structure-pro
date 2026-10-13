"use client";

import { ChevronDown, Eye, Mail, MessageSquare, Plus, Send, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { contactInitials } from "@/src/features/crm/common/utils/formatting";
import { copy } from "@/src/features/crm/conversations/locales/en";
import { reviewQuoteSubject } from "@/src/features/crm/conversations/utils/formatting";

const emailTemplates = [
  { id: "standard", label: copy.emailTemplateStandard },
  { id: "express", label: copy.emailTemplateExpress },
  { id: "financing", label: copy.emailTemplateFinancing },
] as const;

const smsTemplates = [
  { id: "standard", label: copy.smsTemplateStandard },
  { id: "financing", label: copy.smsTemplateFinancing },
  { id: "delivery", label: copy.smsTemplateDelivery },
] as const;

function FirstNameToken() {
  return (
    <span className="ml-1 inline-flex items-center rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 align-middle text-xs font-semibold text-blue-700">
      {copy.firstNameToken}
    </span>
  );
}

function TemplateSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { id: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative inline-flex items-center">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="cursor-pointer appearance-none rounded-md border border-gray-200 bg-gray-50 py-1 pr-7 pl-2.5 text-[11px] font-medium text-gray-800 transition-colors focus:border-black focus:bg-white focus:ring-1 focus:ring-black focus:outline-none"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 h-3 w-3 text-gray-500" aria-hidden="true" />
    </div>
  );
}

function RecipientChip({
  name,
  primary,
  onRemove,
}: {
  name: string;
  primary?: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white py-0.5 pr-1.5 pl-1 text-xs text-gray-900 shadow-xs">
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#121314] font-serif text-[9px] font-bold text-white">
        {contactInitials(name)}
      </span>
      <span className="text-xs font-medium text-gray-900">{name}</span>
      {primary ? (
        <span className="rounded-full border border-gray-200 bg-gray-100 px-1 py-0.5 text-[9px] leading-none font-semibold text-gray-700">
          {copy.primary}
        </span>
      ) : null}
      <button
        type="button"
        aria-label={`${copy.removeRecipient} ${name}`}
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-black"
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
}

export function ReviewSendModal({
  customerName,
  title,
  priceLabel,
  invoiceId,
  imageUrl,
  onClose,
}: {
  customerName: string;
  title: string;
  priceLabel: string;
  invoiceId: string;
  imageUrl: string;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState(() => reviewQuoteSubject(invoiceId, title));
  const [emailTemplate, setEmailTemplate] = useState("standard");
  const [smsTemplate, setSmsTemplate] = useState("standard");
  const [emailRecipient, setEmailRecipient] = useState(true);
  const [smsRecipient, setSmsRecipient] = useState(true);
  const operatorFirst = copy.operatorName.split(" ")[0] || copy.operatorName;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const dialog = (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <button type="button" className="absolute inset-0" aria-label={copy.close} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-send-title"
        className="relative z-10 my-auto flex max-h-[90vh] min-h-0 w-full max-w-xl flex-col overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 font-sans shadow-2xl"
      >
        <div className="flex items-start justify-between pb-4">
          <h3 id="review-send-title" className="font-serif text-xl leading-tight font-bold text-gray-950">
            {copy.reviewAndSendQuote}
          </h3>
          <button
            type="button"
            aria-label={copy.close}
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-4 py-2">
            <div className="flex h-14 w-16 shrink-0 items-center justify-center rounded-lg">
              <img alt={title} src={imageUrl} className="h-full w-full object-contain" />
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="truncate text-xs font-bold text-gray-950">{title}</h4>
                  <span className="inline-flex shrink-0 items-center rounded border border-gray-200 bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                    {copy.draft}
                  </span>
                </div>
                <span className="mt-1 block text-base leading-none font-semibold text-gray-900">{priceLabel}</span>
              </div>
              <button
                type="button"
                className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-xs transition-colors hover:bg-gray-50"
              >
                <Eye className="h-3.5 w-3.5 text-gray-500" strokeWidth={1.8} aria-hidden="true" />
                <span>{copy.seeQuoteDetails}</span>
              </button>
            </div>
          </div>

          <section className="pt-2 pb-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-gray-500" strokeWidth={1.8} aria-hidden="true" />
                <span className="text-xs font-bold tracking-wider text-gray-900 uppercase">{copy.channelEmail}</span>
              </div>
              <TemplateSelect
                label={copy.channelEmail}
                value={emailTemplate}
                options={emailTemplates}
                onChange={setEmailTemplate}
              />
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-gray-600">{copy.to}</label>
                <div className="flex w-full flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-gray-50 p-1.5">
                  {emailRecipient ? (
                    <RecipientChip name={customerName} primary onRemove={() => setEmailRecipient(false)} />
                  ) : null}
                </div>
              </div>
              <div>
                <label htmlFor="review-email-subject" className="mb-1 block text-[11px] font-medium text-gray-600">
                  {copy.subject}
                </label>
                <input
                  id="review-email-subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-900 transition-colors focus:border-black focus:bg-white focus:ring-1 focus:ring-black focus:outline-none"
                />
              </div>
              <div>
                <span className="mb-1 block text-[11px] font-medium text-gray-600">{copy.body}</span>
                <MessageBody>
                  Hi <FirstNameToken />, {copy.reviewEmailLead} {title} ({priceLabel}). {copy.reviewEmailClose}
                </MessageBody>
              </div>
            </div>
          </section>

          <section className="pt-2 pb-1">
            <div className="mb-3 flex items-center justify-between">
              <div className="inline-flex items-center gap-2">
                <MessageSquare className="h-4 w-4 shrink-0 text-gray-500" strokeWidth={1.8} aria-hidden="true" />
                <span className="text-xs font-bold tracking-wider text-gray-900 uppercase">{copy.channelSms}</span>
              </div>
              <TemplateSelect
                label={copy.channelSms}
                value={smsTemplate}
                options={smsTemplates}
                onChange={setSmsTemplate}
              />
            </div>
            <div className="space-y-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-gray-600">{copy.to}</label>
                <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 p-1.5">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                    {smsRecipient ? (
                      <RecipientChip name={customerName} primary onRemove={() => setSmsRecipient(false)} />
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="inline-flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-gray-600 transition-colors hover:bg-white hover:text-black"
                  >
                    <Plus className="h-3 w-3 text-gray-500" aria-hidden="true" />
                    <span>{copy.addRecipient}</span>
                  </button>
                </div>
              </div>
              <MessageBody>
                Hi <FirstNameToken />! {operatorFirst} {copy.reviewSmsLead} {title} {copy.reviewSmsQuote} ({priceLabel}).{" "}
                {copy.reviewSmsClose}
              </MessageBody>
            </div>
          </section>
        </div>

        <div className="mt-4 flex items-center justify-end gap-3 pt-5">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-xs transition-colors hover:bg-gray-100"
          >
            {copy.cancel}
          </button>
          <button
            type="button"
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-black px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-gray-800"
          >
            <span>{copy.sendNow}</span>
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}

function MessageBody({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[72px] w-full rounded-lg border border-gray-200 bg-white p-3 text-xs leading-relaxed text-gray-700">
      {children}
    </div>
  );
}
