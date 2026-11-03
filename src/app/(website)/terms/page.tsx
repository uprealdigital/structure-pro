import type { Metadata } from "next";
import { LegalDocument } from "@/src/features/website/components/legal-document";
import { termsDocument } from "@/src/features/website/locales/legal";

export const metadata: Metadata = {
  title: "Terms and Conditions — TimberCraft",
};

export default function TermsPage() {
  return <LegalDocument document={termsDocument} />;
}
