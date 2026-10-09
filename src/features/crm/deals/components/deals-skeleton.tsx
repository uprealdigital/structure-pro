import { Bone, SkeletonStatus } from "@/src/features/crm/common/components/skeleton";
import { copy } from "@/src/features/crm/deals/locales/en";

const columns: { label: string; cards: number; tone: "default" | "won" | "lost" }[] = [
  { label: copy.stageNewLeads, cards: 2, tone: "default" },
  { label: copy.stageConfigured, cards: 2, tone: "default" },
  { label: copy.stageQuoteSent, cards: 2, tone: "default" },
  { label: copy.stageContract, cards: 1, tone: "default" },
  { label: copy.stageWon, cards: 1, tone: "won" },
  { label: copy.stageLost, cards: 1, tone: "lost" },
];

function columnClass(tone: "default" | "won" | "lost"): string {
  if (tone === "won") return "border-emerald-200 bg-emerald-50/50";
  if (tone === "lost") return "border-gray-200 bg-gray-100/50";
  return "border-gray-200/90 bg-gray-100/70";
}

function DealCardSkeleton() {
  return (
    <div className="rounded-md border border-gray-200/90 bg-white p-3.5 shadow-xs">
      <Bone className="h-3 w-14" />
      <div className="mt-2 flex items-center gap-2">
        <Bone className="h-7 w-7 shrink-0 rounded-full" />
        <Bone className="h-3.5 w-24" />
      </div>
      <Bone className="mt-2 h-3 w-28" />
      <div className="mt-2 border-t border-gray-100 pt-2">
        <Bone className="h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function DealsSkeleton() {
  return (
    <SkeletonStatus>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#f9f9fb]" aria-busy="true">
        <header className="z-10 border-b border-gray-200/80 bg-white px-6 py-4">
          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Bone className="h-8 max-w-lg flex-1 rounded-md" />
              <Bone className="h-8 w-20 shrink-0 rounded-md" />
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Bone className="h-9 w-36 rounded-lg" />
              <Bone className="h-8 w-24 rounded-md" />
            </div>
          </div>
        </header>
        <div className="flex h-full min-h-0 flex-1 items-stretch gap-3 overflow-hidden p-6">
          {columns.map((column) => (
            <section
              key={column.label}
              className={`flex h-full max-h-full w-[280px] shrink-0 flex-col rounded-lg border p-3 ${columnClass(column.tone)}`}
            >
              <div
                className={`mb-3 flex items-center justify-between border-b pb-3 ${
                  column.tone === "won" ? "border-emerald-200" : "border-gray-200"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-gray-300" aria-hidden="true" />
                  <h3 className="truncate font-serif text-xs font-bold tracking-wide text-gray-400 uppercase">
                    {column.label}
                  </h3>
                  <Bone className="h-4 w-6 rounded-full" />
                </div>
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-hidden">
                {Array.from({ length: column.cards }, (_, index) => (
                  <DealCardSkeleton key={index} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </SkeletonStatus>
  );
}
