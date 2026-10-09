"use client";

import type { ReactNode } from "react";
import {
  Calculator,
  ChevronsUpDown,
  ChevronDown,
  CircleHelp,
  Handshake,
  LogOut,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNavCounts } from "@/src/features/crm/common/hooks/use-nav-counts";
import { copy } from "@/src/features/crm/common/locales/en";
import { contactInitials } from "@/src/features/crm/common/utils/formatting";

function NavItem({
  href,
  icon,
  label,
  count,
  current = false,
  danger = false,
}: {
  href?: string;
  icon: ReactNode;
  label: string;
  count?: number;
  current?: boolean;
  danger?: boolean;
}) {
  const className = current
    ? "flex items-center gap-3 rounded-lg bg-[#242629] px-3 py-2 text-xs font-medium text-white shadow-sm"
    : `flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-gray-400 transition-colors hover:bg-[#1c1e20] ${
        danger ? "hover:text-red-400" : "hover:text-white"
      }`;

  const body = (
    <>
      <span className={`shrink-0 ${current ? "text-white" : ""}`} aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count != null ? (
        <span
          className={`ml-auto rounded-full px-2 py-0.5 font-mono text-[10px] ${
            current ? "bg-white/20 text-white" : "text-gray-400"
          }`}
        >
          {count}
        </span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} scroll={false} aria-current={current ? "page" : undefined} className={className}>
        {body}
      </Link>
    );
  }

  return (
    <button type="button" className={`${className} w-full text-left`}>
      {body}
    </button>
  );
}

export function CrmNav() {
  const counts = useNavCounts();
  const pathname = usePathname();
  const dealsActive = pathname === "/crm/deals" || pathname.startsWith("/crm/deals/");
  const conversationsActive =
    pathname === "/crm/conversations" || pathname.startsWith("/crm/conversations/");
  const customersActive = pathname === "/crm/customers" || pathname.startsWith("/crm/customers/");
  const quotesActive = pathname === "/crm/quotes" || pathname.startsWith("/crm/quotes/");
  const settingsActive = pathname === "/crm/settings" || pathname.startsWith("/crm/settings/");
  const supportActive = pathname === "/crm/support" || pathname.startsWith("/crm/support/");
  const iconClass = "h-4 w-4";

  return (
    <aside className="hidden h-full w-72 shrink-0 flex-col justify-between border-r border-[#1e2022] bg-[#121314] px-2.5 py-5 text-gray-300 select-none lg:flex">
      <div className="space-y-8">
        <div className="px-2 pt-2">
          <button
            type="button"
            className="group flex w-full cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-white/[0.06] p-2.5 text-left shadow-sm transition-colors hover:bg-white/[0.09]"
          >
            <span className="flex min-w-0 items-center space-x-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-white font-serif text-xl font-black tracking-wider text-black shadow-sm">
                {copy.mark}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-serif text-[14px] leading-tight font-bold tracking-wide text-white">
                  {copy.brand}
                </span>
                <span className="mt-0.5 block truncate text-[10px] tracking-widest text-gray-400 uppercase">
                  {copy.location}
                </span>
              </span>
            </span>
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 text-gray-400 group-hover:text-white" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label={copy.navigation} className="space-y-1 pr-1">
          <NavItem
            href="/crm/conversations"
            current={conversationsActive}
            count={counts?.conversationCount}
            icon={<MessageSquare className={iconClass} strokeWidth={2} />}
            label={copy.conversations}
          />
          <div className="mx-2 my-3 border-t border-white/10" />
          <NavItem
            href="/crm/deals"
            current={dealsActive}
            count={counts?.dealCount}
            icon={<Handshake className={iconClass} strokeWidth={1.8} />}
            label={copy.deals}
          />
          <NavItem
            href="/crm/customers"
            current={customersActive}
            count={counts?.customerCount}
            icon={<Users className={iconClass} strokeWidth={1.8} />}
            label={copy.customers}
          />
          <NavItem
            href="/crm/quotes"
            current={quotesActive}
            count={counts?.quoteCount}
            icon={<Calculator className={iconClass} strokeWidth={quotesActive ? 2 : 1.8} />}
            label={copy.quotes}
          />
        </nav>
      </div>

      <div>
        <div className="space-y-1.5 border-t border-[#232528] pt-4 text-sm">
          <NavItem
            href="/crm/settings"
            current={settingsActive}
            icon={<Settings className={iconClass} strokeWidth={1.8} />}
            label={copy.settings}
          />
          <NavItem
            href="/crm/support"
            current={supportActive}
            icon={<CircleHelp className={iconClass} strokeWidth={supportActive ? 2 : 1.8} />}
            label={copy.help}
          />
          <NavItem danger icon={<LogOut className={iconClass} strokeWidth={1.8} />} label={copy.logout} />
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-[#232528] px-2 pt-4">
          <div className="flex min-w-0 items-center space-x-3">
            <div className="relative">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white font-serif text-xs font-semibold text-black shadow-xs">
                {contactInitials(copy.operatorName)}
              </div>
              <span className="absolute right-0 bottom-0 h-2 w-2 rounded-full border border-[#121314] bg-emerald-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs leading-tight font-semibold text-white">{copy.operatorName}</p>
              <p className="mt-0.5 truncate text-[10px] leading-tight text-gray-400">{copy.operatorRole}</p>
            </div>
          </div>
          <button
            type="button"
            aria-label={copy.profileOptions}
            className="ml-auto flex items-center justify-center rounded p-1 text-gray-400 transition-colors hover:bg-[#1c1e20] hover:text-white"
          >
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}
