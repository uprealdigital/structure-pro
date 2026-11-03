import Link from "next/link";
import { privacyPath, termsPath } from "@/src/features/website/config/site";
import { copy } from "@/src/features/website/locales/en";

export function WebsiteFooter() {
  return (
    <footer className="w-full bg-[#f3f3f5] pt-16 pb-12 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
        <div className="grid grid-cols-1 gap-10 border-b border-[#c5c6c9]/30 pb-16 md:grid-cols-12">
          <div className="space-y-6 md:col-span-7">
            <div className="flex items-center gap-3">
              <img src="/website/logo.png" alt="" className="h-8 w-8 rounded-lg object-contain" />
              <span className="font-serif text-lg font-semibold tracking-tight">{copy.brand}</span>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-[#44474a]">{copy.summary}</p>
          </div>
          <div className="space-y-4 md:col-span-5 md:pl-6">
            <div className="text-xs font-semibold tracking-wider text-[#44474a] uppercase">{copy.whoWeAre}</div>
            <div className="space-y-2 text-xs text-[#44474a]">
              <div className="text-sm font-medium text-[#1a1c1d]">{copy.company}</div>
              <div className="leading-relaxed">
                {copy.addressLine1}
                <br />
                {copy.addressLine2}
              </div>
              <div className="flex flex-col gap-1 border-t border-[#c5c6c9]/20 pt-2">
                <span>
                  {copy.inquiries}{" "}
                  <a
                    href={`mailto:${copy.email}`}
                    className="font-medium text-[#1a1c1d] underline transition-colors hover:text-[#655d55]"
                  >
                    {copy.email}
                  </a>
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-between gap-4 pt-8 text-xs text-[#44474a] sm:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center sm:justify-start sm:text-left">
            <span>
              © {new Date().getFullYear()} {copy.rights}
            </span>
            <span className="hidden text-[#c5c6c9] sm:inline" aria-hidden="true">
              •
            </span>
            <span>{copy.registered}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href={termsPath} target="_blank" rel="noreferrer" className="transition-colors hover:text-[#1a1c1d]">
              {copy.terms}
            </Link>
            <span className="text-[#c5c6c9]" aria-hidden="true">
              •
            </span>
            <Link href={privacyPath} target="_blank" rel="noreferrer" className="transition-colors hover:text-[#1a1c1d]">
              {copy.privacy}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
