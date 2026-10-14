import type { Metadata } from "next";
import { LegalDocument } from "@/src/features/cpq/components/legal-document";
import { privacyDocument } from "@/src/features/cpq/locales/legal";

export const metadata: Metadata = {
  title: "Privacy Policy — TimberCraft",
};

export default function PrivacyPage() {
  return <LegalDocument document={privacyDocument} />;
}
