import { Bone, SkeletonStatus } from "@/src/features/crm/common/components/skeleton";
import { copy } from "@/src/features/crm/settings/locales/en";

const groups = [3, 1, 3, 2];

export function SettingsSkeleton() {
  return (
    <SkeletonStatus>
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden" aria-busy="true">
        <aside className="z-10 flex h-full w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
          <div className="flex-1 space-y-6 overflow-hidden p-3">
            {groups.map((count, groupIndex) => (
              <div key={groupIndex} className="space-y-1">
                <Bone className="mx-3 mb-1.5 h-2.5 w-16" />
                {Array.from({ length: count }, (_, itemIndex) => (
                  <Bone key={itemIndex} className="h-8 w-full rounded-lg" />
                ))}
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 p-3">
            <div className="flex items-center gap-2 px-2">
              <Bone className="h-2.5 w-14" />
              <Bone className="h-4 w-10 rounded" />
            </div>
          </div>
        </aside>
        <main aria-label={copy.settingsMenu} className="h-full min-w-0 flex-1 bg-[#f9f9fb]" />
      </div>
    </SkeletonStatus>
  );
}
