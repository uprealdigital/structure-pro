import { Bone, SkeletonStatus } from "@/src/features/crm/common/components/skeleton";
import { copy } from "@/src/features/crm/customers/locales/en";

const columns = [copy.dateCreated, copy.firstName, copy.lastName, copy.phone, copy.email];
const rows = 8;

export function CustomersSkeleton() {
  return (
    <SkeletonStatus>
      <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-[#f9f9fb]" aria-busy="true">
        <header className="border-b border-gray-200/80 bg-white">
          <div className="flex items-center gap-4 px-6 py-3.5">
            <Bone className="h-8 w-full max-w-lg rounded-md" />
            <Bone className="h-8 w-20 shrink-0 rounded-md" />
            <Bone className="ml-auto h-8 w-28 shrink-0 rounded-md" />
          </div>
        </header>
        <div className="flex flex-1 flex-col px-6">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-200 font-serif text-[11px] font-bold tracking-wide text-gray-400">
              <tr>
                {columns.map((label) => (
                  <th key={label} className="px-4 py-3.5 font-semibold first:pl-6">
                    {label}
                  </th>
                ))}
                <th className="py-3.5 pr-6 pl-4" />
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }, (_, index) => (
                <tr key={index}>
                  <td className="py-3 pr-4 pl-6">
                    <Bone className="h-3 w-20" />
                  </td>
                  <td className="px-4 py-3">
                    <Bone className="h-3 w-24" />
                  </td>
                  <td className="px-4 py-3">
                    <Bone className="h-3 w-24" />
                  </td>
                  <td className="px-4 py-3">
                    <Bone className="h-3 w-28" />
                  </td>
                  <td className="px-4 py-3">
                    <Bone className="h-3 w-40" />
                  </td>
                  <td className="py-3 pr-6 pl-4">
                    <Bone className="ml-auto h-4 w-4" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-auto flex items-center justify-between border-t border-gray-200/80 px-6 py-4">
            <Bone className="h-3 w-40" />
            <div className="flex items-center gap-2">
              <Bone className="h-7 w-16 rounded" />
              <Bone className="h-7 w-7 rounded" />
              <Bone className="h-7 w-14 rounded" />
            </div>
          </div>
        </div>
      </main>
    </SkeletonStatus>
  );
}
