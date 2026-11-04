"use client";

import { ChevronRight, Filter, Plus, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCrmDesktop } from "@/src/features/crm/common/hooks/use-crm-desktop";
import { contactInitials } from "@/src/features/crm/common/utils/formatting";
import { CustomersSkeleton } from "@/src/features/crm/customers/components/customers-skeleton";
import { copy } from "@/src/features/crm/customers/locales/en";
import {
  customerDetailWireSchema,
  customerListResponseSchema,
  type CustomerDetailWire,
  type CustomerListWire,
} from "@/src/features/crm/customers/types";
import {
  customerPageNumbers,
  formatCustomerDate,
  formatCustomerPhone,
  splitCustomerName,
} from "@/src/features/crm/customers/utils/formatting";
import { dealStatusOption } from "@/src/features/crm/deals/utils/status";

const pageSize = 15;

export function CustomerList() {
  const desktop = useCrmDesktop();
  const [customers, setCustomers] = useState<CustomerListWire[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [detail, setDetail] = useState<CustomerDetailWire>();
  const [detailError, setDetailError] = useState(false);
  const [detailId, setDetailId] = useState<string>();
  const detailRequest = useRef(0);
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? customers.filter((customer) =>
        [customer.full_name, customer.email, customer.phone].join(" ").toLowerCase().includes(needle),
      )
    : customers;
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const page = Math.min(pageIndex, pageCount - 1);
  const rows = desktop ? visible.slice(page * pageSize, page * pageSize + pageSize) : visible;
  const start = visible.length === 0 ? 0 : page * pageSize + 1;
  const end = Math.min(visible.length, (page + 1) * pageSize);
  const pages = customerPageNumbers(page + 1, pageCount);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/crm/customers")
      .then(async (response) => {
        if (!response.ok) throw new Error("load");
        return response.json();
      })
      .then((payload) => {
        if (cancelled) return;
        const parsed = customerListResponseSchema.safeParse(payload);
        if (!parsed.success) throw new Error("load");
        setCustomers(parsed.data.customers);
        setLoadError(false);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function openCustomer(id: string) {
    const ticket = detailRequest.current + 1;
    detailRequest.current = ticket;
    setDetailId(id);
    setDetail(undefined);
    setDetailError(false);
    void fetch(`/api/crm/customers/${encodeURIComponent(id)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("load");
        return response.json();
      })
      .then((payload) => {
        if (ticket !== detailRequest.current) return;
        const parsed = customerDetailWireSchema.safeParse(payload);
        if (!parsed.success) throw new Error("load");
        setDetail(parsed.data);
      })
      .catch(() => {
        if (ticket === detailRequest.current) setDetailError(true);
      });
  }

  if (loading) return <CustomersSkeleton />;

  return (
    <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-[#f9f9fb]">
      <header className="sticky top-0 z-10 border-b border-gray-200/80 bg-white">
        <div className="flex items-center gap-3 px-4 py-3.5 lg:gap-4 lg:px-6">
          <label className="relative min-w-0 flex-1 lg:max-w-lg">
            <span className="sr-only">{copy.searchPlaceholder}</span>
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
            </span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPageIndex(0);
              }}
              placeholder={copy.searchPlaceholder}
              className="w-full rounded-md border border-gray-300 bg-gray-50 py-2 pr-4 pl-9 text-xs text-gray-900 transition-colors outline-none placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black"
            />
          </label>
          <div className="flex shrink-0 items-center space-x-2.5">
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-200/80 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-xs transition-colors hover:border-gray-400 hover:bg-gray-50 hover:text-black"
            >
              <Filter className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
              {copy.filters}
            </button>
          </div>
          <div className="ml-auto hidden shrink-0 lg:block">
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-black px-3.5 py-1.5 text-xs font-medium text-white shadow-xs transition-colors hover:bg-neutral-800"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
              {copy.newCustomer}
            </button>
          </div>
        </div>
      </header>

      {loadError ? (
        <div className="flex flex-1 items-center justify-center px-6">
          <p className="text-sm text-gray-500">{copy.customersLoadError}</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <h2 className="font-serif text-2xl font-semibold text-gray-950">{copy.emptyCustomers}</h2>
          <p className="mt-2 max-w-sm text-sm leading-5 text-gray-500">{copy.emptyCustomersBody}</p>
        </div>
      ) : (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col px-4 pb-20 lg:px-6 lg:pb-0">
          <div className="flex w-full min-w-0 flex-1 flex-col bg-transparent">
            <div className="min-w-0 overflow-x-hidden lg:overflow-x-auto">
              <table className="w-full table-fixed text-left text-xs text-gray-600 lg:table-auto">
                <thead className="hidden border-b border-gray-200 bg-transparent font-serif text-[11px] font-bold tracking-wide text-gray-900 select-none lg:table-header-group">
                  <tr>
                    <th className="py-3.5 pr-4 pl-6 font-semibold text-gray-900">{copy.dateCreated}</th>
                    <th className="px-4 py-3.5 font-semibold text-gray-900">{copy.firstName}</th>
                    <th className="px-4 py-3.5 font-semibold text-gray-900">{copy.lastName}</th>
                    <th className="px-4 py-3.5 font-semibold text-gray-900">{copy.phone}</th>
                    <th className="px-4 py-3.5 font-semibold text-gray-900">{copy.email}</th>
                    <th className="py-3.5 pr-6 pl-4 text-center font-semibold text-gray-900">
                      <span className="sr-only">{copy.actions}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-transparent font-sans">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-sm text-gray-500">
                        {copy.emptyCustomerSearch}
                      </td>
                    </tr>
                  ) : (
                    rows.map((customer) => {
                      const name = splitCustomerName(customer.full_name);
                      return (
                      <tr
                        key={customer.id}
                        onClick={() => openCustomer(customer.id)}
                        className="group cursor-pointer transition-colors hover:bg-gray-50/80"
                      >
                        <td className="hidden py-2.5 pr-4 pl-6 text-xs whitespace-nowrap text-gray-500 lg:table-cell">
                          {formatCustomerDate(customer.created_at)}
                        </td>
                        <td className="max-w-0 py-3 pr-3 align-middle lg:hidden">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-[11px] font-medium text-gray-700">
                              {contactInitials(customer.full_name)}
                            </span>
                            <span className="truncate text-xs font-semibold text-gray-950 group-hover:text-black">
                              {customer.full_name}
                            </span>
                          </div>
                        </td>
                        <td className="hidden px-4 py-2.5 font-medium text-gray-900 lg:table-cell">
                          <div className="flex items-center space-x-3">
                            <span className="text-xs font-semibold text-gray-950 group-hover:text-black">
                              {name.firstName}
                            </span>
                          </div>
                        </td>
                        <td className="hidden px-4 py-2.5 text-xs font-semibold text-gray-950 group-hover:text-black lg:table-cell">
                          {name.lastName}
                        </td>
                        <td className="hidden px-4 py-2.5 font-mono text-xs text-gray-900 lg:table-cell">
                          {formatCustomerPhone(customer.phone)}
                        </td>
                        <td className="hidden max-w-[140px] truncate px-4 py-2.5 text-xs text-gray-600 lg:table-cell" title={customer.email}>
                          {customer.email}
                        </td>
                        <td className="max-w-0 py-3 pl-3 lg:hidden">
                          <div className="truncate text-xs text-gray-600" title={customer.email}>
                            {customer.email}
                          </div>
                          <div className="mt-0.5 truncate font-mono text-xs text-gray-900">
                            {formatCustomerPhone(customer.phone)}
                          </div>
                        </td>
                        <td className="w-6 py-3 text-right lg:w-auto lg:py-2.5 lg:pr-6 lg:pl-4 lg:text-center">
                          <div className="flex items-center justify-end lg:pr-2">
                            <ChevronRight
                              className="h-4 w-4 text-gray-400 transition-colors group-hover:text-gray-700"
                              aria-hidden="true"
                            />
                          </div>
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="hidden items-center justify-between border-t border-gray-200/80 bg-transparent px-6 py-4 text-xs text-gray-500 lg:flex">
            <div className="font-medium">
              {copy.showing} <span className="font-semibold text-gray-900">{start}</span> {copy.rangeTo}{" "}
              <span className="font-semibold text-gray-900">{end}</span> {copy.rangeOf}{" "}
              <span className="font-semibold text-gray-900">{visible.length}</span> {copy.customers}
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPageIndex(page - 1)}
                className={`rounded border px-3 py-1.5 text-xs font-medium shadow-xs ${
                  page === 0
                    ? "cursor-not-allowed border-gray-200 bg-white text-gray-400"
                    : "cursor-pointer border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50"
                }`}
              >
                {copy.previous}
              </button>
              {pages.map((item, index) =>
                item === "ellipsis" ? (
                  <span key={`ellipsis-${index}`} className="px-1 text-gray-400">
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPageIndex(item - 1)}
                    className={`cursor-pointer rounded px-2.5 py-1 text-xs font-medium shadow-xs ${
                      item === page + 1
                        ? "bg-[#121314] text-white"
                        : "text-gray-700 transition-colors hover:bg-gray-200"
                    }`}
                  >
                    {item}
                  </button>
                ),
              )}
              <button
                type="button"
                disabled={page >= pageCount - 1}
                onClick={() => setPageIndex(page + 1)}
                className={`rounded border px-3 py-1.5 text-xs font-medium shadow-xs ${
                  page >= pageCount - 1
                    ? "cursor-not-allowed border-gray-200 bg-white text-gray-400"
                    : "cursor-pointer border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50"
                }`}
              >
                {copy.next}
              </button>
            </div>
          </div>
        </div>
      )}
      {detailId ? (
        <aside className="fixed inset-y-0 right-0 z-30 flex w-full max-w-md flex-col overflow-y-auto border-l border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="font-serif text-lg font-semibold text-gray-950">
              {detail?.full_name ?? customers.find((customer) => customer.id === detailId)?.full_name}
            </h2>
            <button
              type="button"
              onClick={() => {
                setDetailId(undefined);
                setDetail(undefined);
              }}
              className="cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-900"
            >
              {copy.close}
            </button>
          </div>
          {detailError ? (
            <p className="px-6 py-8 text-sm text-gray-500">{copy.customersLoadError}</p>
          ) : !detail ? (
            <p className="px-6 py-8 text-sm text-gray-500">{copy.customers}</p>
          ) : (
            <div className="space-y-6 px-6 py-5 text-sm text-gray-700">
              <div>
                <div className="font-mono text-xs text-gray-900">{formatCustomerPhone(detail.phone)}</div>
                <div className="mt-1 text-xs text-gray-600">{detail.email}</div>
                {detail.conversation ? (
                  <div className="mt-2 text-[11px] text-gray-500">
                    {copy.conversation} {formatCustomerDate(detail.conversation.updated_at)}
                  </div>
                ) : null}
              </div>
              <div>
                <h3 className="font-serif text-xs font-semibold tracking-wide text-gray-900">{copy.deals}</h3>
                {detail.deals.length === 0 ? (
                  <p className="mt-2 text-xs text-gray-500">{copy.noDeals}</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {detail.deals.map((deal) => (
                      <li key={deal.id} className="rounded-md border border-gray-200 px-3 py-2">
                        <div className="text-xs font-semibold text-gray-950">{deal.name}</div>
                        <div className="mt-1 text-[11px] text-gray-500">
                          {dealStatusOption(deal.status)?.label ?? deal.status}
                        </div>
                        {deal.quote ? (
                          <div className="mt-1 text-[11px] text-gray-600">
                            {copy.quote} {deal.quote.quote_number}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </aside>
      ) : null}
    </main>
  );
}
