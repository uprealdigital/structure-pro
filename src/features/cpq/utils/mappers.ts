import {
  buildingConfigSchema,
  storedConfigurationSchema,
  type QuoteSelections,
  type BuildingConfig,
  type StoredConfiguration,
} from "@/src/features/cpq/types";

export function toBuildingConfig(selections: QuoteSelections): BuildingConfig {
  return buildingConfigSchema.parse(selections);
}

export function toStoredConfiguration(
  selections: QuoteSelections,
  lng: string,
): StoredConfiguration {
  return storedConfigurationSchema.parse({ ...selections, lng });
}
