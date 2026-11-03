import type { Metadata } from "next";
import { WebsiteHome } from "@/src/features/website/components/website-home";
import { copy } from "@/src/features/website/locales/en";

export const metadata: Metadata = {
  title: copy.metaTitle,
  description: copy.metaDescription,
  applicationName: copy.brand,
};

export default function WebsitePage() {
  return <WebsiteHome />;
}
