"use client";

import { ChevronDown, Mail, Phone } from "lucide-react";
import { useState, type ReactNode } from "react";
import { copy } from "@/src/features/crm/common/locales/en";
import { contactInitials } from "@/src/features/crm/common/utils/formatting";

export type CustomerPill = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  primary: boolean;
};

function CustomerFace({
  person,
  open,
}: {
  person: CustomerPill;
  open?: boolean;
}) {
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <span className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 font-serif text-[10px] font-bold text-gray-700">
          {contactInitials(person.fullName)}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-900 group-hover:text-black">{person.fullName}</span>
          {person.primary ? (
            <span className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[9px] leading-none font-semibold text-gray-800">
              {copy.primary}
            </span>
          ) : null}
        </span>
      </span>
      <ChevronDown
        className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform duration-200 group-hover:text-gray-700 ${
          open ? "rotate-180" : ""
        }`}
        aria-hidden="true"
      />
    </span>
  );
}

function CustomerLine({ children }: { children: ReactNode }) {
  return <span className="col-start-1 row-start-1 flex items-center gap-2 text-xs whitespace-nowrap">{children}</span>;
}

function CustomerPillItem({ person, startOpen }: { person: CustomerPill; startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen);

  return (
    <div className="inline-grid max-w-full">
      <div className="invisible col-start-1 row-start-1 grid px-3.5" aria-hidden="true">
        <span className="col-start-1 row-start-1">
          <CustomerFace person={person} />
        </span>
        <CustomerLine>
          <Phone className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
          {person.phone}
        </CustomerLine>
        <CustomerLine>
          <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
          {person.email}
        </CustomerLine>
      </div>
      <div
        className={`col-start-1 row-start-1 max-w-full bg-gray-50/90 px-3.5 transition-all ${
          open ? "rounded-2xl py-3.5" : "rounded-full py-2"
        }`}
      >
        <button
          type="button"
          className="group flex cursor-pointer items-center text-left select-none"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <CustomerFace person={person} open={open} />
        </button>
        {open ? (
          <div className="mt-3.5 grid gap-2 text-xs text-gray-700">
            <a href={`tel:${person.phone}`} className="flex items-center gap-2 font-normal whitespace-nowrap">
              <Phone className="h-3.5 w-3.5 shrink-0 text-gray-500" strokeWidth={1.8} aria-hidden="true" />
              <span>{person.phone}</span>
            </a>
            <a
              href={`mailto:${person.email}`}
              className="flex items-center gap-2 font-normal whitespace-nowrap text-gray-600 hover:text-gray-900 hover:underline"
            >
              <Mail className="h-3.5 w-3.5 shrink-0 text-gray-500" strokeWidth={1.8} aria-hidden="true" />
              <span>{person.email}</span>
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CustomerPills({
  people,
  openId,
}: {
  people: CustomerPill[];
  openId?: string;
}) {
  if (people.length === 0) return null;

  return (
    <div className="flex flex-wrap items-start gap-2">
      {people.map((person) => (
        <CustomerPillItem key={person.id} person={person} startOpen={person.id === openId} />
      ))}
    </div>
  );
}
