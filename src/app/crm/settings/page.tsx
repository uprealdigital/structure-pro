import { SettingsWorkspace } from "@/src/features/crm/settings/components/settings-workspace";
import { copy } from "@/src/features/crm/common/locales/en";

export const metadata = {
  title: `${copy.settings} · ${copy.brand} ${copy.product}`,
};

export default function SettingsPage() {
  return <SettingsWorkspace />;
}
