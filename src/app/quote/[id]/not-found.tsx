import { portalCopy } from "@/src/features/crm/quotes/locales/en";

export default function QuoteNotFound() {
  return (
    <main className="flex flex-1 items-center justify-center bg-[#f9f9fb] px-6 py-16">
      <p className="font-serif text-2xl font-semibold tracking-tight text-[#1a1c1d]">{portalCopy.notFound}</p>
    </main>
  );
}
