"use client";

import { ChevronDown, Eye, Mail, Phone, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { contactInitials } from "@/src/features/crm/common/utils/formatting";
import { copy } from "@/src/features/crm/conversations/locales/en";
import type { ConversationParticipant } from "@/src/features/crm/conversations/types";
import type { Customer } from "@/src/features/crm/common/types";

function menuOrder(participants: ConversationParticipant[], customerId: string): ConversationParticipant[] {
  return [...participants].sort((left, right) => {
    const leftActive = left.customer.id === customerId;
    const rightActive = right.customer.id === customerId;
    if (leftActive !== rightActive) return leftActive ? -1 : 1;
    if (left.isPrimary !== right.isPrimary) return left.isPrimary ? -1 : 1;
    return left.customer.fullName.localeCompare(right.customer.fullName);
  });
}

function stackAvatars(participants: ConversationParticipant[], customerId: string): ConversationParticipant[] {
  const front = participants[0];
  if (!front) return [];
  const others = participants.slice(1);
  const back = others.find((participant) => participant.customer.id === customerId) ?? others[0];
  return back ? [front, back] : [front];
}

function CustomerChoices({
  participants,
  customerId,
  onChoose,
}: {
  participants: ConversationParticipant[];
  customerId: string;
  onChoose: (participant: ConversationParticipant) => void;
}) {
  return (
    <div className="space-y-2.5 p-3.5">
      {menuOrder(participants, customerId).map((participant) => {
        const primary = participant.isPrimary;
        const current = participant.customer.id === customerId;
        return (
          <button
            key={participant.customer.id}
            type="button"
            role="menuitem"
            aria-current={current ? "true" : undefined}
            onClick={() => onChoose(participant)}
            className={`flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors ${
              current
                ? "border-gray-300 bg-[#f5f5f7] hover:bg-gray-100"
                : primary
                  ? "border-gray-200/60 bg-gray-50/90 hover:bg-gray-100"
                  : "border-gray-200/60 bg-white hover:bg-gray-50"
            }`}
          >
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2.5">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-serif text-[11px] font-bold ${
                    current || primary ? "bg-[#121314] text-white" : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {contactInitials(participant.customer.fullName)}
                </span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className={`text-xs text-gray-950 ${current || primary ? "font-bold" : "font-semibold"}`}>
                    {participant.customer.fullName}
                  </span>
                  {primary ? (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] leading-none font-semibold text-gray-800 ${
                        current ? "bg-white" : "bg-gray-200"
                      }`}
                    >
                      {copy.primary}
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="mt-0.5 block space-y-0.5 pl-[2.375rem] text-[11px] text-gray-600">
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3 w-3 shrink-0 text-gray-400" strokeWidth={1.8} aria-hidden="true" />
                  <span>{participant.customer.phone}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3 w-3 shrink-0 text-gray-400" strokeWidth={1.8} aria-hidden="true" />
                  <span className="truncate">{participant.customer.email}</span>
                </span>
              </span>
            </span>
            {current ? (
              <Eye className="h-3.5 w-3.5 shrink-0 text-black" strokeWidth={2} aria-hidden="true" />
            ) : (
              <span className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function CustomerMenu({
  participants,
  customer,
  conversationId,
  onSelect,
}: {
  participants: ConversationParticipant[];
  customer: Customer;
  conversationId: string;
  onSelect: (participant: ConversationParticipant) => void;
}) {
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const sheetTitleId = useId();
  const avatars = stackAvatars(participants, customer.id);
  const multiple = participants.length > 1;

  useEffect(() => {
    if (!multiple) return;
    function close(event: MouseEvent) {
      const target = event.target as Node;
      if (menu.current?.contains(target) || sheet.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [multiple]);

  function choose(participant: ConversationParticipant) {
    setOpen(false);
    if (participant.customer.id === customer.id || participant.conversationId === conversationId) return;
    onSelect(participant);
  }

  const identity = (
    <>
      <span className="flex shrink-0 items-center">
        {avatars.map((participant, index) => (
          <span
            key={participant.customer.id}
            className={`flex items-center justify-center rounded-full border font-serif font-bold ${
              index === 0
                ? "relative z-10 h-8 w-8 border-gray-200 bg-gray-100 text-xs text-gray-700 shadow-xs"
                : "relative z-0 -ml-[19px] h-7 w-7 border-white bg-gray-200 text-[10px] text-gray-600"
            }`}
          >
            {contactInitials(participant.customer.fullName)}
          </span>
        ))}
      </span>
      <span className="flex min-w-0 items-center gap-1">
        <h2
          className={`truncate font-sans text-base font-bold tracking-tight text-gray-950 ${
            multiple ? "transition-colors group-hover:text-gray-700" : ""
          }`}
        >
          {customer.fullName}
        </h2>
        {multiple ? (
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-gray-500 transition-transform duration-200 group-hover:text-gray-900 ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        ) : null}
      </span>
    </>
  );

  return (
    <div ref={menu} className="relative z-50 flex min-w-0 items-center">
      {multiple ? (
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={copy.dealCustomers}
          onClick={() => setOpen((value) => !value)}
          className="group -m-1 flex min-w-0 cursor-pointer items-center gap-2 rounded-lg p-1 text-left transition-colors hover:bg-gray-100 focus:outline-none"
        >
          {identity}
        </button>
      ) : (
        <div className="-m-1 flex min-w-0 items-center gap-2 p-1">{identity}</div>
      )}
      {multiple && open ? (
        <div
          role="menu"
          aria-label={copy.dealCustomers}
          className="absolute top-full left-0 z-50 mt-2 hidden w-80 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xl lg:block"
        >
          <CustomerChoices participants={participants} customerId={customer.id} onChoose={choose} />
        </div>
      ) : null}
      {multiple && open
        ? createPortal(
            <div ref={sheet} className="fixed inset-0 z-50 lg:hidden">
              <button type="button" aria-label={copy.close} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={sheetTitleId}
                className="absolute inset-x-0 bottom-0 flex max-h-full flex-col overflow-hidden rounded-t-2xl border-t border-gray-200 bg-white text-gray-900"
              >
                <div className="max-h-[100dvh] overflow-y-auto pb-[45px]">
                  <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-3">
                    <h2 id={sheetTitleId} className="min-w-0 flex-1 truncate font-serif text-sm font-semibold text-gray-900">
                      {copy.dealCustomers}
                    </h2>
                    <button
                      type="button"
                      aria-label={copy.close}
                      onClick={() => setOpen(false)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <CustomerChoices participants={participants} customerId={customer.id} onChoose={choose} />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
