"use client";

import { Children, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Calculator, ChevronLeft, ChevronRight, CircleHelp, Eye, Handshake, LogOut, MapPin, MessageSquare, Settings, TriangleAlert, Users, X } from "lucide-react";
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
  onNavigate,
}: {
  href: string;
  label: string;
  current: boolean;
  count?: number;
  icon: ReactNode;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={current ? "page" : undefined}
      onClick={onNavigate}
      className={`flex min-w-0 flex-1 flex-col items-center justify-center py-1 ${current ? "text-black" : "text-[#44474a]"}`}
    >
      <span className="flex h-7 items-center justify-center">
        <span
          className={`relative flex items-center justify-center ${current ? "rounded-full bg-[#e8e8ea] px-2.5 py-1" : ""}`}
        >
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

const accountSteps = ["account", "organizations", "dealerships"] as const;
type AccountStep = (typeof accountSteps)[number];

function AccountSlider({ index, children }: { index: number; children: ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const previousIndex = useRef(index);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const panels = Children.toArray(children);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const account = accountRef.current;
    if (!viewport || !account) return;
    const measure = () => {
      const nextWidth = viewport.clientWidth;
      const nextHeight = account.offsetHeight;
      setWidth((current) => (current === nextWidth ? current : nextWidth));
      setHeight((current) => (current === nextHeight ? current : nextHeight));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(account);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const from = previousIndex.current;
    if (from === index) return;
    previousIndex.current = index;
    const track = trackRef.current;
    const organizationsPanel = track?.children[1] as HTMLElement | undefined;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!track || !organizationsPanel || from !== 2 || index !== 0 || width <= 0 || reducedMotion) return;

    track.style.transition = "none";
    organizationsPanel.style.width = "0px";
    track.style.transform = `translateX(-${width}px)`;
    track.getBoundingClientRect();
    track.style.transition = "transform 300ms ease-out";
    track.style.transform = "translateX(0px)";

    let finished = false;
    const restore = () => {
      if (finished) return;
      finished = true;
      organizationsPanel.style.width = `${width}px`;
      track.style.transition = "";
      track.style.transform = "translateX(0px)";
    };
    const timeout = window.setTimeout(restore, 320);
    track.addEventListener("transitionend", restore, { once: true });
    return () => {
      window.clearTimeout(timeout);
      track.removeEventListener("transitionend", restore);
      if (!finished) {
        restore();
        previousIndex.current = from;
      }
    };
  }, [index, width]);

  return (
    <div ref={viewportRef} className="overflow-hidden" style={height > 0 ? { height } : undefined}>
      <div
        ref={trackRef}
        className="flex items-start transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={{ transform: width > 0 ? `translateX(-${index * width}px)` : undefined }}
      >
        {panels.map((panel, panelIndex) => (
          <div
            key={panelIndex}
            ref={panelIndex === 0 ? accountRef : undefined}
            className="shrink-0 overflow-hidden"
            style={{
              width: width > 0 ? width : "100%",
              height: panelIndex > 0 && height > 0 ? height : undefined,
            }}
            aria-hidden={panelIndex === index ? undefined : true}
            inert={panelIndex === index ? undefined : true}
          >
            {panel}
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountStepHeader({ title, titleId, onBack }: { title: string; titleId: string; onBack: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 px-3 pt-3 pb-3">
      <button
        type="button"
        aria-label={copy.back}
        onClick={onBack}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-900 transition-colors hover:bg-gray-100"
      >
        <ChevronLeft className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
      </button>
      <h2 id={titleId} className="min-w-0 truncate font-serif text-base font-semibold text-gray-900">
        {title}
      </h2>
    </div>
  );
}

function CurrentMark({ active }: { active: boolean }) {
  if (!active) return <span className="h-4 w-4 shrink-0" aria-hidden="true" />;
  return <Eye className="h-4 w-4 shrink-0 text-black" strokeWidth={2} aria-hidden="true" />;
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
  const profileTitleId = useId();
  const accountsTitleId = useId();
  const dealershipTitleId = useId();
  const initial = organizations.find((organization) => organization.dealerships.length > 0);
  const [dealershipId, setDealershipId] = useState(initial?.dealerships[0]?.id ?? "");
  const [viewedOrganizationId, setViewedOrganizationId] = useState(initial?.id ?? "");
  const [step, setStep] = useState<AccountStep>("account");
  const current = organizations
    .flatMap((organization) => organization.dealerships.map((dealership) => ({ organization, dealership })))
    .find((entry) => entry.dealership.id === dealershipId);
  const viewed = organizations.find((organization) => organization.id === viewedOrganizationId) ?? current?.organization;
  const stepIndex = accountSteps.indexOf(step);
  const titleId = step === "organizations" ? accountsTitleId : step === "dealerships" ? dealershipTitleId : profileTitleId;

  function goBack() {
    setStep((currentStep) => (currentStep === "dealerships" ? "organizations" : "account"));
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (step === "account") onClose();
      else goBack();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, step]);

  return (
    <div className="fixed inset-x-0 top-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-50 lg:hidden">
      <button type="button" aria-label={copy.closeAccount} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-x-0 bottom-0 flex max-h-full flex-col overflow-hidden rounded-t-2xl border-t border-gray-200 bg-white text-gray-900"
      >
        <AccountSlider index={stepIndex}>
          <div className="max-h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] overflow-y-auto">
            <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-3 py-3">
              <div className="relative shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-100 font-serif text-sm font-semibold text-gray-900">
                  {contactInitials(copy.operatorName)}
                </div>
                <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full bg-[#047857] ring-2 ring-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id={profileTitleId} className="truncate font-serif text-sm font-semibold text-gray-900">
                  {copy.operatorName}
                </h2>
                <p className="truncate text-[11px] text-gray-500">{copy.operatorEmail}</p>
              </div>
              <button
                type="button"
                aria-label={copy.closeAccount}
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
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
                <button
                  type="button"
                  aria-label={`${copy.switchOrganization}, ${current.organization.name}, ${current.dealership.name}`}
                  onClick={() => {
                    setViewedOrganizationId(current.organization.id);
                    setStep("organizations");
                  }}
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
                  <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
                </button>
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
          <div className="flex h-full min-h-0 flex-col">
            <AccountStepHeader title={copy.organizations} titleId={accountsTitleId} onBack={goBack} />
            <div className="min-h-0 flex-1 overflow-y-auto" aria-label={copy.organizations}>
              {organizations.map((organization) => {
                const active = organization.id === current?.organization.id;
                return (
                  <button
                    key={organization.id}
                    type="button"
                    aria-current={active ? "true" : undefined}
                    onClick={() => {
                      setViewedOrganizationId(organization.id);
                      setStep("dealerships");
                    }}
                    className={`flex w-full items-center justify-between gap-3 border-b border-gray-100 px-3 py-3 text-left last:border-b-0 ${
                      active ? "bg-gray-100" : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 font-serif text-sm font-bold text-gray-900">
                        {organization.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-serif text-sm font-bold text-gray-900">{organization.name}</span>
                        <span className="block truncate text-xs text-gray-500">{copy.locationCount(organization.dealerships.length)}</span>
                      </span>
                    </span>
                    <CurrentMark active={active} />
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex h-full min-h-0 flex-col">
            <AccountStepHeader title={copy.dealership} titleId={dealershipTitleId} onBack={goBack} />
            <div className="min-h-0 flex-1 overflow-y-auto" aria-label={copy.dealerships}>
              {viewed?.dealerships.map((dealership) => {
                const active = dealership.id === current?.dealership.id;
                return (
                  <button
                    key={dealership.id}
                    type="button"
                    aria-current={active ? "true" : undefined}
                    onClick={() => {
                      setDealershipId(dealership.id);
                      setStep("account");
                    }}
                    className={`flex w-full items-center justify-between gap-3 border-b border-gray-100 px-3 py-3 text-left last:border-b-0 ${
                      active ? "bg-gray-100" : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <MapPin className={`h-4 w-4 shrink-0 ${active ? "text-gray-900" : "text-gray-400"}`} strokeWidth={active ? 2 : 1.8} aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-gray-900">{dealership.name}</span>
                        {dealership.description ? (
                          <span className="block truncate text-xs text-gray-500">{dealership.description}</span>
                        ) : null}
                      </span>
                    </span>
                    <CurrentMark active={active} />
                  </button>
                );
              })}
            </div>
          </div>
        </AccountSlider>
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
  const closeAccount = () => setAccountOpen(false);

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
          icon={<MessageSquare className={iconClass} strokeWidth={conversationsActive ? 2 : 1.8} />}
          onNavigate={closeAccount}
        />
        <MobileTab
          href="/deals"
          label={copy.deals}
          current={dealsActive}
          icon={<Handshake className={iconClass} strokeWidth={dealsActive ? 2 : 1.8} />}
          onNavigate={closeAccount}
        />
        <MobileTab
          href="/customers"
          label={copy.customers}
          current={customersActive}
          icon={<Users className={iconClass} strokeWidth={customersActive ? 2 : 1.8} />}
          onNavigate={closeAccount}
        />
        <MobileTab
          href="/quotes"
          label={copy.quotes}
          current={quotesActive}
          icon={<Calculator className={iconClass} strokeWidth={quotesActive ? 2 : 1.8} />}
          onNavigate={closeAccount}
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

function hidesMobileNav(pathname: string) {
  return (
    pathname === "/settings" ||
    pathname.startsWith("/settings/") ||
    pathname === "/support" ||
    pathname.startsWith("/support/")
  );
}

export function CrmMobileShell({
  organizations,
  children,
}: {
  organizations: OrganizationDirectoryEntry[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const hideNav = hidesMobileNav(pathname);
  const [menuHidden, setMenuHidden] = useState(false);
  const [reserveNavSpace, setReserveNavSpace] = useState(true);
  const coverNav = menuHidden || !reserveNavSpace || hideNav;

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
        {menuHidden || hideNav ? null : <CrmMobileNav organizations={organizations} />}
      </CrmMobileContentInsetProvider>
    </CrmMobileNavHiddenProvider>
  );
}
