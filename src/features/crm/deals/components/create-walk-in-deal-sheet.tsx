"use client";

import { X } from "lucide-react";
import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { copy } from "@/src/features/crm/deals/locales/en";

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-gray-700">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black";

export function CreateWalkInDealSheet({
  fullName,
  phone,
  email,
  errors,
  pending,
  onChange,
  onSubmit,
  onClose,
}: {
  fullName: string;
  phone: string;
  email: string;
  errors: Partial<Record<"fullName" | "phone" | "email" | "form", string>>;
  pending: boolean;
  onChange: (field: "fullName" | "phone" | "email", value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const nameId = useId();
  const phoneId = useId();
  const emailId = useId();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-x-0 top-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-50 lg:inset-0 lg:bottom-0">
      <button type="button" aria-label={copy.closeCreateDeal} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-x-0 bottom-0 flex max-h-full flex-col overflow-hidden rounded-t-2xl border-t border-gray-200 bg-white text-gray-900 lg:inset-x-auto lg:top-1/2 lg:bottom-auto lg:left-1/2 lg:w-full lg:max-w-md lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:border"
      >
        <form
          className="flex max-h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] min-h-0 flex-col lg:max-h-[calc(100dvh-4rem)]"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 px-4 py-3">
            <h2 id={titleId} className="min-w-0 flex-1 truncate font-serif text-base font-semibold text-gray-900">
              {copy.createDealTitle}
            </h2>
            <button
              type="button"
              aria-label={copy.closeCreateDeal}
              onClick={onClose}
              disabled={pending}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900 disabled:opacity-50"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
            <Field id={nameId} label={copy.fullName} error={errors.fullName}>
              <input
                id={nameId}
                name="fullName"
                autoComplete="name"
                value={fullName}
                onChange={(event) => onChange("fullName", event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field id={phoneId} label={copy.phone} error={errors.phone}>
              <input
                id={phoneId}
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={phone}
                onChange={(event) => onChange("phone", event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field id={emailId} label={copy.email} error={errors.email}>
              <input
                id={emailId}
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => onChange("email", event.target.value)}
                className={inputClass}
              />
            </Field>
            {errors.form ? <p className="text-xs text-red-600">{errors.form}</p> : null}
          </div>
          <div className="shrink-0 border-t border-gray-200 px-4 py-3">
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-md bg-black px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-60"
            >
              {pending ? copy.creatingDeal : copy.createDeal}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
