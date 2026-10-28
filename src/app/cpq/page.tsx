import { BuildingConfigurator } from "@/src/features/cpq/components/building-configurator";

export const metadata = {
  title: "TimberCraft 3D Studio",
  description: "Configure a building in 3D — style, siding, roof, and size.",
};

export default function CpqPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <BuildingConfigurator />
    </div>
  );
}
