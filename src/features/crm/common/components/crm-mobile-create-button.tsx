import { Plus } from "lucide-react";
import Link from "next/link";

const className =
  "fixed right-4 bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)] z-30 flex h-14 w-14 items-center justify-center rounded-full bg-black text-white shadow-lg lg:hidden";

export function CrmMobileCreateButton({ label, href }: { label: string; href?: string }) {
  const icon = <Plus className="h-6 w-6" strokeWidth={2.25} aria-hidden="true" />;
  if (href) {
    return (
      <Link href={href} aria-label={label} className={className}>
        {icon}
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} className={className}>
      {icon}
    </button>
  );
}
