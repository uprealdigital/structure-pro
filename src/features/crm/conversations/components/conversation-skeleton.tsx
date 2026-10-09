import { Bone, SkeletonStatus } from "@/src/features/crm/common/components/skeleton";
import { copy } from "@/src/features/crm/common/locales/en";

const inboxRows = 8;

export function ConversationDetailSkeleton() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#f9f9fb]" aria-busy="true">
      <span className="sr-only">{copy.loading}</span>
      <header className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-5 py-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <Bone className="h-8 w-8 rounded-full" />
            <Bone className="h-4 w-36" />
            <Bone className="h-7 w-7 rounded-full" />
          </div>
          <Bone className="h-3 w-44" />
          <Bone className="h-5 w-16 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <Bone className="h-16 w-20 rounded-lg" />
          <div className="flex flex-col gap-1.5">
            <Bone className="h-7 w-16 rounded-md" />
            <Bone className="h-7 w-16 rounded-md" />
          </div>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-6 py-5">
        <div className="flex max-w-xl items-start">
          <Bone className="mr-2.5 h-7 w-7 shrink-0 rounded-full" />
          <Bone className="h-16 w-72 rounded-2xl" />
        </div>
        <div className="ml-auto flex max-w-xl items-start justify-end">
          <Bone className="h-20 w-80 rounded-2xl bg-gray-300" />
          <Bone className="ml-2.5 h-7 w-7 shrink-0 rounded-full" />
        </div>
        <div className="flex max-w-xl items-start">
          <Bone className="mr-2.5 h-7 w-7 shrink-0 rounded-full" />
          <Bone className="h-12 w-56 rounded-2xl" />
        </div>
        <div className="ml-auto flex max-w-xl items-start justify-end">
          <Bone className="h-14 w-64 rounded-2xl bg-gray-300" />
          <Bone className="ml-2.5 h-7 w-7 shrink-0 rounded-full" />
        </div>
      </div>
      <div className="shrink-0 border-t border-gray-200 bg-white p-4">
        <Bone className="h-11 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function ConversationSkeleton() {
  return (
    <SkeletonStatus>
      <section className="z-10 flex h-full min-h-0 w-full shrink-0 flex-col border-r border-gray-200 bg-white lg:w-96">
        <div className="border-b border-gray-200 px-4 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <Bone className="h-8 min-w-0 flex-1 rounded-md" />
            <Bone className="h-7 w-20 rounded-full" />
          </div>
        </div>
        <ul className="min-h-0 flex-1 divide-y divide-gray-100 overflow-hidden">
          {Array.from({ length: inboxRows }, (_, index) => (
            <li key={index} className="p-3.5">
              <div className="mb-1 flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <Bone className="h-8 w-8 rounded-full" />
                  <Bone className="h-3 w-28" />
                </div>
                <Bone className="h-2.5 w-10" />
              </div>
              <Bone className="mt-2 ml-10.5 h-3 w-44" />
            </li>
          ))}
        </ul>
      </section>
      <section className="hidden min-h-0 min-w-0 flex-1 lg:flex">
        <ConversationDetailSkeleton />
      </section>
    </SkeletonStatus>
  );
}
