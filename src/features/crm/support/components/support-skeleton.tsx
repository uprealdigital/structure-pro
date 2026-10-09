import { Bone, SkeletonStatus } from "@/src/features/crm/common/components/skeleton";

export function SupportSkeleton() {
  return (
    <SkeletonStatus>
      <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#f9f9fb]" aria-busy="true">
        <div className="w-full max-w-7xl flex-1 p-8">
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 pt-4 md:grid-cols-2">
            {Array.from({ length: 2 }, (_, index) => (
              <article
                key={index}
                className="flex flex-col justify-between rounded-lg border border-gray-200 bg-white p-8 shadow-sm"
              >
                <div className="space-y-6">
                  <Bone className="h-10 w-10 rounded-lg" />
                  <Bone className="h-6 w-48" />
                  <div className="space-y-2">
                    <Bone className="h-3 w-full" />
                    <Bone className="h-3 w-5/6" />
                    <Bone className="h-3 w-2/3" />
                  </div>
                </div>
                <div className="mt-8 border-t border-gray-100 pt-5">
                  <Bone className="h-10 w-full rounded-lg" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
    </SkeletonStatus>
  );
}
