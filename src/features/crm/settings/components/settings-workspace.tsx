"use client";

import {
  Box,
  CircleDollarSign,
  FileText,
  Image as ImageIcon,
  MessageSquare,
  Plug,
  Settings,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { copy } from "@/src/features/crm/settings/locales/en";

type SettingsSectionId =
  | "general"
  | "team"
  | "integrations"
  | "scripts"
  | "catalog"
  | "pricing"
  | "rules"
  | "yard"
  | "chat";

type SettingsItem = {
  id: SettingsSectionId;
  label: string;
  icon: LucideIcon;
  count?: string;
  muted?: boolean;
};

const groups: { label: string; items: SettingsItem[] }[] = [
  {
    label: copy.generalGroup,
    items: [
      { id: "general", label: copy.general, icon: Settings },
      { id: "team", label: copy.teamRoles, icon: Users, muted: true },
      { id: "integrations", label: copy.integrations, icon: Plug, muted: true },
    ],
  },
  {
    label: copy.salesGroup,
    items: [{ id: "scripts", label: copy.scripts, icon: FileText }],
  },
  {
    label: copy.configuratorGroup,
    items: [
      { id: "catalog", label: copy.catalog, icon: Box, count: copy.catalogCount },
      { id: "pricing", label: copy.pricing, icon: CircleDollarSign, muted: true },
      { id: "rules", label: copy.rulesOptions, icon: Shield, muted: true },
    ],
  },
  {
    label: copy.automationGroup,
    items: [
      { id: "yard", label: copy.yardVisualizer, icon: ImageIcon },
      { id: "chat", label: copy.chatAssistant, icon: MessageSquare },
    ],
  },
];

export function SettingsWorkspace() {
  const [active, setActive] = useState<SettingsSectionId>("general");

  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
      <aside className="z-10 flex h-full w-64 shrink-0 flex-col border-r border-gray-200 bg-white select-none">
        <nav aria-label={copy.settingsMenu} className="flex-1 space-y-6 overflow-y-auto p-3">
          {groups.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="mb-1.5 px-3 font-mono text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                {group.label}
              </p>
              {group.items.map((item) => {
                const current = item.id === active;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={current ? "page" : undefined}
                    onClick={() => setActive(item.id)}
                    className={
                      current
                        ? "flex w-full items-center gap-2.5 rounded-lg bg-gray-100 px-3 py-2 text-left text-xs font-semibold text-gray-950 transition-colors"
                        : `flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-gray-50 hover:text-gray-900 ${
                            item.muted ? "text-gray-600" : "text-gray-700"
                          }`
                    }
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${current ? "text-gray-800" : "text-gray-500"}`}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                    {item.count ? (
                      <>
                        <span className="min-w-0 flex-1">{item.label}</span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          {item.count}
                        </span>
                      </>
                    ) : (
                      <span>{item.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="border-t border-gray-100 p-3">
          <div className="flex items-center gap-2 px-2">
            <span className="font-mono text-[10px] font-medium tracking-wider text-gray-400 uppercase">
              {copy.version}
            </span>
            <span className="rounded border border-gray-200 bg-gray-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-gray-700">
              {copy.versionValue}
            </span>
          </div>
        </div>
      </aside>
      <main className="flex h-full min-w-0 flex-1 flex-col overflow-y-auto bg-[#f9f9fb]" />
    </div>
  );
}
