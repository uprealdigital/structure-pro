"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Calculator, ChevronRight, CircleHelp, Handshake, LogOut, MessageSquare, Settings, TriangleAlert, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CrmMobileContentInsetContext,
  CrmMobileNavHiddenContext,
} from "@/src/features/crm/common/hooks/use-crm-mobile-nav";
import { useNavCounts } from "@/src/features/crm/common/hooks/use-nav-counts";
import { copy } from "@/src/features/crm/common/locales/en";
import type { OrganizationDirectoryEntry } from "@/src/features/crm/common/types";
import { contactInitials } from "@/src/features/crm/common/utils/formatting";

function MobileTab({
  href,
  label,
  current,
  count,
  icon,
}: {
  href: string;
  label: string;
  current: boolean;
  count?: number;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={current ? "page" : undefined}
      className={`flex min-w-0 flex-1 flex-col items-center justify-center py-1 ${current ? "text-black" : "text-[#44474a]"}`}
    >
      <span className="flex h-7 items-center justify-center">
        <span className="relative flex items-center justify-center">
          {icon}
          {count != null && count > 0 ? (
            <span className="absolute -top-2 -right-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-black px-1 text-[10px] leading-none font-bold text-white ring-2 ring-white">
              {count}
            </span>
          ) : null}
        </span>
      </span>
      <span className={`mt-0.5 max-w-full truncate text-[10px] leading-none tracking-tight ${current ? "font-semibold" : "font-medium"}`}>
        {label}
      </span>
    </Link>
  );
}

function AccountSheet({
  organizations,
  attentionCount,
  onClose,
}: {
  organizations: OrganizationDirectoryEntry[];
  attentionCount?: number;
  onClose: () => void;
}) {
  const titleId = useId();
  const initial = organizations.find((organization) => organization.dealerships.length > 0);
  const [dealershipId, setDealershipId] = useState(initial?.dealerships[0]?.id ?? "");
  const [picking, setPicking] = useState(false);
  const current = organizations
    .flatMap((organization) => organization.dealerships.map((dealership) => ({ organization, dealership })))
    .find((entry) => entry.dealership.id === dealershipId);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-x-0 top-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-50 lg:hidden">
      <button type="button" aria-label={copy.closeAccount} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-x-0 bottom-0 flex max-h-full flex-col overflow-y-auto rounded-t-2xl border-t border-gray-200 bg-white text-gray-900"
      >
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-3 pt-2 pb-3">
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              aria-label={copy.closeAccount}
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <div className="relative shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-100 font-serif text-sm font-semibold text-gray-900">
                {contactInitials(copy.operatorName)}
              </div>
              <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full bg-[#047857] ring-2 ring-white" />
            </div>
            <div className="min-w-0">
              <h2 id={titleId} className="truncate font-serif text-sm font-semibold text-gray-900">
                {copy.operatorName}
              </h2>
              <p className="truncate text-[11px] text-gray-500">{copy.operatorEmail}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 px-3 py-3">
          <div className="flex items-center justify-between rounded-xl border border-[#fecaca] bg-[#fef2f2] p-2 text-[#dc2626]">
            <span className="flex min-w-0 items-center gap-2">
              <TriangleAlert className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden="true" />
              <span className="truncate text-xs font-semibold text-gray-900">{copy.requiresAttention}</span>
            </span>
            {attentionCount != null ? (
              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#dc2626] px-1.5 text-[10px] leading-none font-bold text-white">
                {attentionCount}
              </span>
            ) : null}
          </div>
          {current ? (
            <div className="flex flex-col gap-1">
              <button
                type="button"
                aria-expanded={picking}
                onClick={() => setPicking((open) => !open)}
                className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50/80 p-3 text-left transition-colors hover:bg-gray-100"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 font-serif text-sm font-bold text-gray-900">
                    {current.organization.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-serif text-sm font-bold text-gray-900">{current.organization.name}</span>
                    <span className="block truncate text-xs text-gray-500">{current.dealership.name}</span>
                  </span>
                </span>
                <ChevronRight className={`h-5 w-5 shrink-0 text-gray-400 ${picking ? "rotate-90" : ""}`} aria-hidden="true" />
              </button>
              {picking ? (
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  {organizations.flatMap((organization) =>
                    organization.dealerships.map((dealership) => {
                      const active = dealership.id === current.dealership.id;
                      return (
                        <button
                          key={dealership.id}
                          type="button"
                          aria-current={active ? "true" : undefined}
                          onClick={() => {
                            setDealershipId(dealership.id);
                            setPicking(false);
                          }}
                          className={`flex w-full items-center gap-3 border-b border-gray-100 px-3 py-2.5 text-left last:border-b-0 ${
                            active ? "bg-gray-100" : "bg-white hover:bg-gray-50"
                          }`}
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-gray-100 font-serif text-xs font-bold text-gray-900">
                            {organization.icon}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-gray-900">{organization.name}</span>
                            <span className="block truncate text-[11px] text-gray-500">{dealership.name}</span>
                          </span>
                        </button>
                      );
                    }),
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/80 p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 font-serif text-sm font-bold text-gray-900">
                {copy.mark}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-serif text-sm font-bold text-gray-900">{copy.brand}</span>
                <span className="block truncate text-xs text-gray-500">{copy.location}</span>
              </span>
            </div>
          )}
          <div className="flex flex-col gap-1 border-t border-gray-200 pt-1">
            <Link
              href="/settings"
              scroll={false}
              className="flex items-center gap-3 rounded-lg p-2 text-gray-800 transition-colors hover:bg-gray-100"
            >
              <Settings className="h-[18px] w-[18px] text-gray-500" strokeWidth={1.8} aria-hidden="true" />
              <span className="text-[13px] font-medium">{copy.settings}</span>
            </Link>
            <Link
              href="/support"
              scroll={false}
              className="flex items-center gap-3 rounded-lg p-2 text-gray-800 transition-colors hover:bg-gray-100"
            >
              <CircleHelp className="h-[18px] w-[18px] text-gray-500" strokeWidth={1.8} aria-hidden="true" />
              <span className="text-[13px] font-medium">{copy.help}</span>
            </Link>
            <button type="button" className="flex items-center gap-3 rounded-lg p-2 text-left text-[#dc2626] transition-colors hover:bg-[#fef2f2]">
              <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
              <span className="text-[13px] font-medium">{copy.logout}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CrmMobileNav({ organizations }: { organizations: OrganizationDirectoryEntry[] }) {
  const counts = useNavCounts();
  const pathname = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);
  const seenPath = useRef(pathname);

  useEffect(() => {
    if (seenPath.current === pathname) return;
    seenPath.current = pathname;
    setAccountOpen(false);
  }, [pathname]);
  const dealsActive = pathname === "/deals" || pathname.startsWith("/deals/");
  const conversationsActive =
    pathname === "/" || pathname === "/conversations" || pathname.startsWith("/conversations/");
  const customersActive = pathname === "/customers" || pathname.startsWith("/customers/");
  const quotesActive = pathname === "/quotes" || pathname.startsWith("/quotes/");
  const unread = counts && counts.unreadActivityCount > 0 ? counts.unreadActivityCount : undefined;
  const iconClass = "h-5 w-5";

  return (
    <>
      <nav
        aria-label={copy.navigation}
        className="fixed inset-x-0 bottom-0 z-40 box-border flex h-[calc(4rem+env(safe-area-inset-bottom))] items-end justify-around border-t border-[#edeef0] bg-white px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg lg:hidden"
      >
        <MobileTab
          href="/conversations"
          label={copy.conversations}
          current={conversationsActive}
          count={unread}
          icon={<MessageSquare className={iconClass} strokeWidth={conversationsActive ? 2 : 1.8} fill={conversationsActive ? "currentColor" : "none"} />}
        />
        <MobileTab
          href="/deals"
          label={copy.deals}
          current={dealsActive}
          icon={<Handshake className={iconClass} strokeWidth={dealsActive ? 2 : 1.8} />}
        />
        <MobileTab
          href="/customers"
          label={copy.customers}
          current={customersActive}
          icon={<Users className={iconClass} strokeWidth={customersActive ? 2 : 1.8} />}
        />
        <MobileTab
          href="/quotes"
          label={copy.quotes}
          current={quotesActive}
          icon={<Calculator className={iconClass} strokeWidth={quotesActive ? 2 : 1.8} />}
        />
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={accountOpen}
          aria-label={copy.accountMenu}
          onClick={() => setAccountOpen((open) => !open)}
          className={`flex min-w-0 flex-1 flex-col items-center justify-center py-1 ${accountOpen ? "text-black" : "text-[#44474a]"}`}
        >
          <span className="flex h-7 items-center justify-center">
            <span className="relative flex items-center justify-center">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ${
                  accountOpen ? "bg-black text-white" : "bg-[#e8e8ea] text-[#1a1c1d]"
                }`}
              >
                {contactInitials(copy.operatorName)}
              </span>
              <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full bg-[#047857] ring-2 ring-white" />
            </span>
          </span>
          <span className={`mt-0.5 max-w-full truncate text-[10px] leading-none tracking-tight ${accountOpen ? "font-semibold" : "font-medium"}`}>
            {copy.account}
          </span>
        </button>
      </nav>
      {accountOpen ? (
        <AccountSheet
          organizations={organizations}
          attentionCount={counts?.conversationCount}
          onClose={() => setAccountOpen(false)}
        />
      ) : null}
    </>
  );
}

function CrmMobileNavHiddenProvider({
  setHidden,
  children,
}: {
  setHidden: (hidden: boolean) => void;
  children: ReactNode;
}) {
  return <CrmMobileNavHiddenContext.Provider value={setHidden}>{children}</CrmMobileNavHiddenContext.Provider>;
}

function CrmMobileContentInsetProvider({
  setReserve,
  children,
}: {
  setReserve: (reserve: boolean) => void;
  children: ReactNode;
}) {
  return <CrmMobileContentInsetContext.Provider value={setReserve}>{children}</CrmMobileContentInsetContext.Provider>;
}

export function CrmMobileShell({
  organizations,
  children,
}: {
  organizations: OrganizationDirectoryEntry[];
  children: ReactNode;
}) {
  const [menuHidden, setMenuHidden] = useState(false);
  const [reserveNavSpace, setReserveNavSpace] = useState(true);
  const coverNav = menuHidden || !reserveNavSpace;

  return (
    <CrmMobileNavHiddenProvider setHidden={setMenuHidden}>
      <CrmMobileContentInsetProvider setReserve={setReserveNavSpace}>
        <div
          className={`flex min-h-0 min-w-0 flex-1 overflow-hidden bg-[#f9f9fb] text-gray-950 max-lg:fixed max-lg:inset-x-0 max-lg:top-0 ${
            coverNav ? "max-lg:bottom-0" : "max-lg:bottom-[calc(4rem+env(safe-area-inset-bottom))]"
          }`}
        >
          {children}
        </div>
        {menuHidden ? null : <CrmMobileNav organizations={organizations} />}
      </CrmMobileContentInsetProvider>
    </CrmMobileNavHiddenProvider>
  );
}
