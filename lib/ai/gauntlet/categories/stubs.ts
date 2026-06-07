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
  return {
    id: entry.id,
    customerModelLanguage: getCustomerModelLanguage(entry.id),
    triageAliases: [entry.id],
    stages: SHARED_STAGE_MASKS,
    dataPoints: [...SHARED_FOUNDATION_DATA_POINTS],
  };
}

export const stubCategoryConfigs: CategoryTrackConfig[] = TAXONOMY_MATRIX.filter(
  (entry) => entry.id !== "1.1_digital_software",
).map(buildFoundationOnlyConfig);

export function isRegisteredCategory(categoryId: string): boolean {
  return BUSINESS_CATEGORY_IDS.includes(
    categoryId as (typeof BUSINESS_CATEGORY_IDS)[number],
  );
}
