import {
  DIGITAL_SOFTWARE_EVALUATION_KEYS,
  digitalSoftwareCategoryConfig,
} from "@/lib/ai/gauntlet/categories/1-1-digital-software";
import {
  EXPERIENTIAL_SOFTWARE_EVALUATION_KEYS,
  experientialSoftwareCategoryConfig,
} from "@/lib/ai/gauntlet/categories/1-3-experiential-software";
import { stubCategoryConfigs } from "@/lib/ai/gauntlet/categories/stubs";
import {
  isUserAcquisitionDataPoint,
} from "@/lib/ai/gauntlet/data-point-utils";
import type {
  CategoryTrackConfig,
  DataPointDefinition,
  ExtractedData,
  GauntletStage,
  OnboardingSessionState,
} from "@/lib/ai/gauntlet/types";
import {
  isPendingCategory,
  isValidBusinessCategory,
  PENDING_CATEGORY,
} from "@/lib/ai/gauntlet/taxonomy";

const CATEGORY_REGISTRY: Record<string, CategoryTrackConfig> = {
  [digitalSoftwareCategoryConfig.id]: digitalSoftwareCategoryConfig,
  [experientialSoftwareCategoryConfig.id]: experientialSoftwareCategoryConfig,
};

for (const config of stubCategoryConfigs) {
  CATEGORY_REGISTRY[config.id] = config;
}

export { DIGITAL_SOFTWARE_EVALUATION_KEYS, EXPERIENTIAL_SOFTWARE_EVALUATION_KEYS };

export function listRegisteredCategories(): string[] {
  return Object.keys(CATEGORY_REGISTRY);
}

export function getCategoryConfig(categoryId: string): CategoryTrackConfig {
  if (isPendingCategory(categoryId)) {
    throw new Error(
      'Cannot load questionnaire for "pending" — triage must resolve first.',
    );
  }

  const resolvedId = resolveClassifiedCategory(categoryId) ?? categoryId;
  const config = CATEGORY_REGISTRY[resolvedId];
  if (!config) {
    throw new Error(
      `No questionnaire configuration registered for category "${categoryId}".`,
    );
  }
  return config;
}

export function tryGetCategoryConfig(
  categoryId: string,
): CategoryTrackConfig | null {
  if (isPendingCategory(categoryId)) {
    return null;
  }
  return CATEGORY_REGISTRY[categoryId] ?? null;
}

export function getFirstDataPoint(
  config: CategoryTrackConfig,
): DataPointDefinition {
  const first = config.dataPoints[0];
  if (!first) {
    throw new Error(`Category "${config.id}" has no configured data points.`);
  }
  return first;
}

export function initializeExtractedDataForCategory(
  config: CategoryTrackConfig,
): ExtractedData {
  const data: ExtractedData = {};
  for (const point of config.dataPoints) {
    data[point.key] = "";
  }
  return data;
}

export function getDataPointByKey(
  config: CategoryTrackConfig,
  key: string,
): DataPointDefinition | undefined {
  return config.dataPoints.find((point) => point.key === key);
}

export function getStageForDataPoint(
  config: CategoryTrackConfig,
  key: string,
): GauntletStage {
  return getDataPointByKey(config, key)?.stage ?? 1;
}

export function getFoundationKeys(config: CategoryTrackConfig): string[] {
  return config.dataPoints.filter((point) => point.isFoundation).map((p) => p.key);
}

export function isFoundationComplete(
  config: CategoryTrackConfig,
  extractedData: OnboardingSessionState["extractedData"],
): boolean {
  return getFoundationKeys(config).every((key) => {
    const value = extractedData[key];
    return typeof value === "string" && value.trim().length > 0;
  });
}

export function getNextUnpopulatedDataPoint(
  config: CategoryTrackConfig,
  extractedData: OnboardingSessionState["extractedData"],
  minimumStage: GauntletStage = 1,
): DataPointDefinition | null {
  for (const point of config.dataPoints) {
    if (point.stage < minimumStage) {
      continue;
    }

    if (!isUserAcquisitionDataPoint(point)) {
      continue;
    }

    if (!isFoundationComplete(config, extractedData) && !point.isFoundation) {
      continue;
    }

    const value = extractedData[point.key];
    if (!value || value.trim().length === 0) {
      return point;
    }
  }

  return null;
}

export function getStageMaskLanguage(
  config: CategoryTrackConfig,
  stage: GauntletStage,
): string {
  return (
    config.stages.find((entry) => entry.stage === stage)?.customerLanguage ??
    "the next piece of the plan"
  );
}

export function buildQuestionnaireSchemaForCategory(
  config: CategoryTrackConfig,
): string {
  return config.dataPoints
    .map(
      (point) =>
        `- ${point.key} (section: ${point.section}; intent: ${point.targetIntent}; validation: ${point.analystCriteria}; label: ${point.streetSmartLabel}${
          point.isMultipleChoice && point.allowedValues
            ? `; multiple-choice: ${point.allowedValues.join(" | ")}`
            : point.allowedValues
              ? `; allowed: ${point.allowedValues.join(" | ")}`
              : ""
        })`,
    )
    .join("\n");
}

export function getDependentKeysAfter(
  config: CategoryTrackConfig,
  pivotFromKey: string,
): string[] {
  const pivotIndex = config.dataPoints.findIndex((point) => point.key === pivotFromKey);
  if (pivotIndex === -1) {
    return [];
  }

  return config.dataPoints.slice(pivotIndex + 1).map((point) => point.key);
}

export function resolveClassifiedCategory(
  raw: string | null | undefined,
): string | null {
  if (!raw) {
    return null;
  }

  const normalized = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (isValidBusinessCategory(normalized)) {
    return normalized;
  }
  if (CATEGORY_REGISTRY[normalized]) {
    return normalized;
  }

  const legacyMap: Record<string, string> = {
    "1.1_digital_software": "1.1D_cloud_utility_saas",
    "1.1_saas": "1.1D_cloud_utility_saas",
    "1.1a_static_assets": "1.1A_static_assets",
    "1.1b_ecosystem_extensions": "1.1B_ecosystem_extensions",
    "1.1c_experiential_software": "1.1C_experiential_software",
    "1.1d_cloud_utility_saas": "1.1D_cloud_utility_saas",
    saas_digital: "1.1D_cloud_utility_saas",
    micro_saas: "1.1D_cloud_utility_saas",
    web_app: "1.1D_cloud_utility_saas",
    software: "1.1D_cloud_utility_saas",
    digital_software: "1.1D_cloud_utility_saas",
    chrome_extension: "1.1B_ecosystem_extensions",
    wordpress_plugin: "1.1B_ecosystem_extensions",
    shopify_app: "1.1B_ecosystem_extensions",
    figma_plugin: "1.1B_ecosystem_extensions",
    mobile_game: "1.1C_experiential_software",
    video_game: "1.1C_experiential_software",
    gumroad: "1.1A_static_assets",
    digital_product: "1.1A_static_assets",
    notion_template: "1.1A_static_assets",
    marketplace: "3.1_platform_marketplace",
    local_service: "2.1_solo_freelance",
    physical_goods: "1.2_physical_inventory",
    brick_and_mortar: "1.2_physical_inventory",
    creator_content: "1.3_media_content_ip",
    consulting_agency: "2.2_agency_managed",
    hardware_deep_tech: "3.3_financial_capital",
  };

  return legacyMap[normalized] ?? null;
}
