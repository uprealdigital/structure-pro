"use client";

import { useEffect, useId, useState } from "react";
import { ChevronsUpDown, Eye, MapPin } from "lucide-react";
import { copy } from "@/src/features/crm/common/locales/en";
import type { Dealership, OrganizationDirectoryEntry } from "@/src/features/crm/common/types";

function selectedDealership(
  organizations: OrganizationDirectoryEntry[],
  dealershipId: string,
): { organization: OrganizationDirectoryEntry; dealership: Dealership } | undefined {
  for (const organization of organizations) {
    const dealership = organization.dealerships.find((item) => item.id === dealershipId);
    if (dealership) return { organization, dealership };
  }
  return undefined;
}

export function OrganizationSwitcher({
  organizations,
  onOpenChange,
}: {
  organizations: OrganizationDirectoryEntry[];
  onOpenChange?: (open: boolean) => void;
}) {
  const menuId = useId();
  const initialOrganization = organizations.find((organization) => organization.dealerships.length > 0);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(initialOrganization?.dealerships[0]?.id ?? "");
  const [viewedOrganizationId, setViewedOrganizationId] = useState(initialOrganization?.id ?? "");

  function setMenu(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
  }

  const current = selectedDealership(organizations, selectedId);
  const viewed =
    organizations.find((organization) => organization.id === viewedOrganizationId) ?? organizations[0];

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      onOpenChange?.(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onOpenChange, open]);

  if (!current || !viewed) {
    return (
      <button
        type="button"
        className="group flex w-full cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-white/[0.06] p-2.5 text-left shadow-sm transition-colors hover:bg-white/[0.09]"
      >
        <span className="flex min-w-0 items-center space-x-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-white font-serif text-xl font-black tracking-wider text-black shadow-sm">
            {copy.mark}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-serif text-[14px] leading-tight font-bold tracking-wide text-white uppercase">
              {copy.brand}
            </span>
            <span className="mt-0.5 block truncate text-[10px] tracking-widest text-gray-400 uppercase">
              {copy.location}
            </span>
          </span>
        </span>
        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 text-gray-400 group-hover:text-white" aria-hidden="true" />
      </button>
    );
  }

  function showOrganization(organizationId: string) {
    setViewedOrganizationId(organizationId);
  }

  function chooseDealership(dealershipId: string) {
    setSelectedId(dealershipId);
    setMenu(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${copy.switchOrganization}, ${current.organization.name}, ${current.dealership.name}`}
        onClick={() => {
          if (open) {
            setMenu(false);
            return;
          }
          setViewedOrganizationId(current.organization.id);
          setMenu(true);
        }}
        className="group flex w-full cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-white/[0.06] p-2.5 text-left shadow-sm transition-colors hover:bg-white/[0.09]"
      >
        <span className="flex min-w-0 items-center space-x-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-white font-serif text-xl font-black tracking-wider text-black shadow-sm">
            {current.organization.icon}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-serif text-[14px] leading-tight font-bold tracking-wide text-white uppercase">
              {current.organization.name}
            </span>
            <span className="mt-0.5 block truncate text-[10px] tracking-widest text-gray-400 uppercase">
              {current.dealership.name}
            </span>
          </span>
        </span>
        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 text-gray-400 group-hover:text-white" aria-hidden="true" />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
          <div
            id={menuId}
            role="dialog"
            aria-label={copy.switchOrganization}
            className="absolute top-full left-0 z-50 mt-2 w-[520px] overflow-hidden rounded-xl border border-white/10 bg-[#1a1c1e] font-sans text-white shadow-2xl"
          >
            <div className="grid grid-cols-2 divide-x divide-white/10">
              <div className="bg-[#1a1c1e] p-2.5">
                <div className="mt-1 space-y-1" aria-label={copy.organizations}>
                  {organizations.map((organization) => {
                    const active = organization.dealerships.some((dealership) => dealership.id === current.dealership.id);
                    const viewing = organization.id === viewed.id;
                    return (
                      <button
                        key={organization.id}
                        type="button"
                        aria-current={active ? "true" : undefined}
                        onClick={() => showOrganization(organization.id)}
                        className={
                          viewing
                            ? "flex w-full cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-white/10 p-2 text-left transition-colors"
                            : "flex w-full cursor-pointer items-center justify-between rounded-lg border border-transparent p-2 text-left text-gray-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                        }
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span
                            className={
                              viewing
                                ? "flex h-7 w-7 shrink-0 items-center justify-center rounded bg-white font-serif text-xs font-bold text-black"
                                : "flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#2a2c30] font-serif text-xs font-bold text-gray-300"
                            }
                          >
                            {organization.icon}
                          </span>
                          <span className="min-w-0">
                            <span
                              className={
                                viewing
                                  ? "block truncate text-xs leading-tight font-semibold text-white"
                                  : "block truncate text-xs leading-tight font-medium"
                              }
                            >
                              {organization.name}
                            </span>
                            <span className="mt-0.5 block truncate text-[10px] leading-tight text-gray-400">
                              {copy.locationCount(organization.dealerships.length)}
                            </span>
                          </span>
                        </span>
                        {active ? <Eye className="ml-1.5 h-4 w-4 shrink-0 text-white" aria-hidden="true" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="bg-[#151618] p-2.5">
                <div className="mt-1 space-y-1" aria-label={copy.dealerships}>
                  {viewed.dealerships.map((dealership) => {
                    const active = dealership.id === current.dealership.id;
                    return (
                      <button
                        key={dealership.id}
                        type="button"
                        aria-current={active ? "true" : undefined}
                        onClick={() => chooseDealership(dealership.id)}
                        className={
                          active
                            ? "flex w-full cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-white/10 p-2 text-left transition-colors"
                            : "flex w-full cursor-pointer items-center justify-between rounded-lg border border-transparent p-2 text-left text-gray-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                        }
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <MapPin
                            className={active ? "h-3.5 w-3.5 shrink-0 text-white" : "h-3.5 w-3.5 shrink-0 text-gray-500"}
                            strokeWidth={active ? 2 : 1.8}
                            aria-hidden="true"
                          />
                          <span className="min-w-0">
                            <span
                              className={
                                active
                                  ? "block truncate text-xs leading-tight font-semibold text-white"
                                  : "block truncate text-xs leading-tight font-medium"
                              }
                            >
                              {dealership.name}
                            </span>
                            <span className="mt-0.5 block truncate text-[10px] leading-tight text-gray-400">
                              {dealership.description}
                            </span>
                          </span>
                        </span>
                        {active ? <Eye className="ml-1.5 h-4 w-4 shrink-0 text-white" aria-hidden="true" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
