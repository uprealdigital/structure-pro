import { SupportWorkspace } from "@/src/features/crm/support/components/support-workspace";
import { copy } from "@/src/features/crm/common/locales/en";

export const metadata = {
  title: `${copy.help} · ${copy.brand} ${copy.product}`,
};

export default function SupportPage() {
  return <SupportWorkspace />;
}
