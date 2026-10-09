"use client";

import { ChevronRight, Filter, Plus, Search } from "lucide-react";
import { useState } from "react";
import { copy } from "@/src/features/crm/customers/locales/en";
import type { CustomerListItem } from "@/src/features/crm/customers/types";
import {
  customerPageNumbers,
  formatCustomerDate,
  formatCustomerPhone,
} from "@/src/features/crm/customers/utils/formatting";

const pageSize = 15;

export function CustomerList({
  customers,
  loadError,
}: {
  customers: CustomerListItem[];
  loadError: boolean;
}) {
  const [query, setQuery] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? customers.filter((customer) =>
        [customer.firstName, customer.lastName, customer.email, customer.phone]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
    : customers;
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const page = Math.min(pageIndex, pageCount - 1);
  const rows = visible.slice(page * pageSize, page * pageSize + pageSize);
  const start = visible.length === 0 ? 0 : page * pageSize + 1;
  const end = Math.min(visible.length, (page + 1) * pageSize);
  const pages = customerPageNumbers(page + 1, pageCount);

  return (
    <main className="flex h-full min-w-0 flex-1 flex-col overflow-y-auto bg-[#f9f9fb]">
      <header className="sticky top-0 z-10 border-b border-gray-200/80 bg-white">
        <div className="flex items-center gap-4 px-6 py-3.5">
          <label className="relative w-full min-w-0 max-w-lg">
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
          <div className="ml-auto shrink-0">
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
        <div className="flex flex-1 flex-col px-6">
          <div className="flex w-full flex-1 flex-col bg-transparent">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="border-b border-gray-200 bg-transparent font-serif text-[11px] font-bold tracking-wide text-gray-900 select-none">
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
                    rows.map((customer) => (
                      <tr key={customer.id} className="group cursor-pointer transition-colors hover:bg-gray-50/80">
                        <td className="py-2.5 pr-4 pl-6 text-xs whitespace-nowrap text-gray-500">
                          {formatCustomerDate(customer.createdAt)}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-gray-900">
                          <div className="flex items-center space-x-3">
                            <span className="text-xs font-semibold text-gray-950 group-hover:text-black">
                              {customer.firstName}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs font-semibold text-gray-950 group-hover:text-black">
                          {customer.lastName}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-900">
                          {formatCustomerPhone(customer.phone)}
                        </td>
                        <td className="max-w-[140px] truncate px-4 py-2.5 text-xs text-gray-600" title={customer.email}>
                          {customer.email}
                        </td>
                        <td className="py-2.5 pr-6 pl-4 text-center">
                          <div className="flex items-center justify-end pr-2">
                            <ChevronRight
                              className="h-4 w-4 text-gray-400 transition-colors group-hover:text-gray-700"
                              aria-hidden="true"
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-200/80 bg-transparent px-6 py-4 text-xs text-gray-500">
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
    </main>
  );
}
