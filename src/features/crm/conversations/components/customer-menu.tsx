"use client";

import { ChevronDown, Mail, Phone, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { contactInitials } from "@/src/features/crm/common/utils/formatting";
import { copy } from "@/src/features/crm/conversations/locales/en";
import type { ConversationParticipant } from "@/src/features/crm/conversations/types";
import type { Customer } from "@/src/features/crm/common/types";

function stackAvatars(participants: ConversationParticipant[], customerId: string): ConversationParticipant[] {
  const front = participants[0];
  if (!front) return [];
  const others = participants.slice(1);
  const back = others.find((participant) => participant.customer.id === customerId) ?? others[0];
  return back ? [front, back] : [front];
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
  const avatars = stackAvatars(participants, customer.id);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!menu.current?.contains(event.target as Node)) setOpen(false);
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
  }, []);

  function choose(participant: ConversationParticipant) {
    setOpen(false);
    if (participant.customer.id === customer.id || participant.conversationId === conversationId) return;
    onSelect(participant);
  }

  return (
    <div ref={menu} className="relative z-50 flex items-center">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={copy.dealCustomers}
        onClick={() => setOpen((value) => !value)}
        className="group -m-1 flex cursor-pointer items-center gap-2 rounded-lg p-1 text-left transition-colors hover:bg-gray-100 focus:outline-none"
      >
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
        <span className="flex items-center gap-1">
          <h2 className="font-serif text-base font-bold tracking-tight text-gray-950 transition-colors group-hover:text-gray-700">
            {customer.fullName}
          </h2>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-gray-500 transition-transform duration-200 group-hover:text-gray-900 ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </span>
      </button>
      {open ? (
        <div
          role="menu"
          aria-label={copy.dealCustomers}
          className="absolute top-full left-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xl"
        >
          <div className="space-y-2.5 border-b border-gray-100 p-3.5">
            {participants.map((participant) => {
              const primary = participant.isPrimary;
              const current = participant.customer.id === customer.id;
              return (
                <button
                  key={participant.customer.id}
                  type="button"
                  role="menuitem"
                  aria-current={current ? "true" : undefined}
                  onClick={() => choose(participant)}
                  className={`w-full rounded-xl border border-gray-200/60 p-2.5 text-left transition-colors ${
                    primary ? "bg-gray-50/90 hover:bg-gray-100" : "bg-white hover:bg-gray-50"
                  }`}
                >
                  <span className="flex items-start gap-2.5">
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-serif text-[11px] font-bold ${
                        primary ? "bg-[#121314] text-white" : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {contactInitials(participant.customer.fullName)}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className={`text-xs text-gray-950 ${primary ? "font-bold" : "font-semibold"}`}>
                          {participant.customer.fullName}
                        </span>
                        {primary ? (
                          <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-[9px] leading-none font-semibold text-gray-800">
                            {copy.primary}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block space-y-0.5 text-[11px] text-gray-600">
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
                  </span>
                </button>
              );
            })}
          </div>
          <div className="bg-gray-50/70 px-3.5 py-2.5">
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-xs transition-colors hover:bg-gray-100 hover:text-gray-950"
            >
              <Plus className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
              <span>{copy.addPersonToDeal}</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
