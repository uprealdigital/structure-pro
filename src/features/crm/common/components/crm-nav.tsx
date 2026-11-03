"use client";

import { useState, type ReactNode } from "react";
import {
  Calculator,
  ChevronDown,
  CircleHelp,
  Handshake,
  LogOut,
  MessageSquare,
  Settings,
  TriangleAlert,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrganizationSwitcher } from "@/src/features/crm/common/components/organization-switcher";
import { useNavCounts } from "@/src/features/crm/common/hooks/use-nav-counts";
import { copy } from "@/src/features/crm/common/locales/en";
import type { OrganizationDirectoryEntry } from "@/src/features/crm/common/types";
import { contactInitials } from "@/src/features/crm/common/utils/formatting";

function NavItem({
  href,
  icon,
  label,
  count,
  countStyle = "plain",
  current = false,
  danger = false,
}: {
  href?: string;
  icon: ReactNode;
  label: string;
  count?: number;
  countStyle?: "pill" | "plain";
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
          className={
            countStyle === "pill"
              ? "ml-auto rounded-full bg-white/20 px-2 py-0.5 font-mono text-[10px] text-white"
              : "ml-auto font-mono text-[10px] text-gray-400"
          }
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

export function CrmNav({ organizations }: { organizations: OrganizationDirectoryEntry[] }) {
  const counts = useNavCounts();
  const pathname = usePathname();
  const dealsActive = pathname === "/deals" || pathname.startsWith("/deals/");
  const conversationsActive =
    pathname === "/" || pathname === "/conversations" || pathname.startsWith("/conversations/");
  const customersActive = pathname === "/customers" || pathname.startsWith("/customers/");
  const quotesActive = pathname === "/quotes" || pathname.startsWith("/quotes/");
  const settingsActive = pathname === "/settings" || pathname.startsWith("/settings/");
  const supportActive = pathname === "/support" || pathname.startsWith("/support/");
  const iconClass = "h-4 w-4";
  const [switcherOpen, setSwitcherOpen] = useState(false);

  return (
    <aside
      className={`${switcherOpen ? "z-30" : ""} relative hidden h-full w-72 shrink-0 flex-col justify-between border-r border-[#1e2022] bg-[#121314] px-2.5 py-5 text-gray-300 select-none lg:flex`}
    >
      <div className="space-y-8">
        <div className="px-2 pt-2">
          <OrganizationSwitcher organizations={organizations} onOpenChange={setSwitcherOpen} />
        </div>

        <nav aria-label={copy.navigation} className="space-y-1 pr-1">
          <NavItem
            href="/conversations"
            current={conversationsActive}
            countStyle="pill"
            count={counts && counts.unreadActivityCount > 0 ? counts.unreadActivityCount : undefined}
            icon={<MessageSquare className={iconClass} strokeWidth={2} />}
            label={copy.conversations}
          />
          <div className="mx-2 my-3 border-t border-white/10" />
          <NavItem
            href="/deals"
            current={dealsActive}
            count={counts?.dealCount}
            icon={<Handshake className={iconClass} strokeWidth={1.8} />}
            label={copy.deals}
          />
          <NavItem
            href="/customers"
            current={customersActive}
            count={counts?.customerCount}
            icon={<Users className={iconClass} strokeWidth={1.8} />}
            label={copy.customers}
          />
          <NavItem
            href="/quotes"
            current={quotesActive}
            count={counts?.quoteCount}
            icon={<Calculator className={iconClass} strokeWidth={quotesActive ? 2 : 1.8} />}
            label={copy.quotes}
          />
        </nav>
      </div>

      <div>
        <button
          type="button"
          className="mb-3 flex w-full items-center gap-2.5 rounded-full border border-[#5b2a2b] bg-[#202122] px-3 py-2 text-white transition-colors hover:bg-[#2a2c2e]"
        >
          <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-red-500" strokeWidth={2} aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-left text-[13px] font-semibold">
            {copy.requiresAttention}
          </span>
          {counts?.conversationCount != null ? (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold leading-none text-white">
              {counts.conversationCount}
            </span>
          ) : null}
        </button>
        <div className="space-y-1.5 border-t border-[#232528] pt-4 text-sm">
          <NavItem
            href="/settings"
            current={settingsActive}
            icon={<Settings className={iconClass} strokeWidth={1.8} />}
            label={copy.settings}
          />
          <NavItem
            href="/support"
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
