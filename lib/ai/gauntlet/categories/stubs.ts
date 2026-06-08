import { normalizeCategoryConfig } from "@/lib/ai/gauntlet/data-point-utils";
import {
  SHARED_FOUNDATION_DATA_POINTS,
  SHARED_STAGE_MASKS,
} from "@/lib/ai/gauntlet/categories/shared-foundation";
import type { CategoryTrackConfig } from "@/lib/ai/gauntlet/types";
import {
  BUSINESS_CATEGORY_IDS,
  getCustomerModelLanguage,
  type TaxonomyEntry,
  TAXONOMY_MATRIX,
} from "@/lib/ai/gauntlet/taxonomy";

function buildFoundationOnlyConfig(entry: TaxonomyEntry): CategoryTrackConfig {
  return normalizeCategoryConfig({
    id: entry.id,
    customerModelLanguage: getCustomerModelLanguage(entry.id),
    triageAliases: [entry.id],
    stages: SHARED_STAGE_MASKS,
    dataPoints: [...SHARED_FOUNDATION_DATA_POINTS],
  });
}

const FULL_QUESTIONNAIRE_CATEGORY_IDS = new Set<string>([
  "1.1D_cloud_utility_saas",
  "1.1C_experiential_software",
]);

export const stubCategoryConfigs: CategoryTrackConfig[] = TAXONOMY_MATRIX.filter(
  (entry) => !FULL_QUESTIONNAIRE_CATEGORY_IDS.has(entry.id),
).map(buildFoundationOnlyConfig);

export function isRegisteredCategory(categoryId: string): boolean {
  return BUSINESS_CATEGORY_IDS.includes(
    categoryId as (typeof BUSINESS_CATEGORY_IDS)[number],
  );
}
