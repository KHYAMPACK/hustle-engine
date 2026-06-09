import type {
  ActiveQuestionContext,
  CategoryTrackConfig,
  DataPointDefinition,
  DataPointSection,
  ForcedChoices,
} from "@/lib/ai/gauntlet/types";

export type { ContextualExampleResolverContext } from "@/lib/ai/gauntlet/types";

export type DataPointDefinitionInput = Omit<
  DataPointDefinition,
  "isMultipleChoice" | "section"
> & {
  isMultipleChoice?: boolean;
  section?: DataPointSection;
};

export const DEFAULT_DATA_POINT_FLAGS = {
  isMultipleChoice: false,
  section: "user_acquisition" as const,
};

export function normalizeDataPoint(
  point: DataPointDefinitionInput,
): DataPointDefinition {
  return {
    ...point,
    isMultipleChoice: point.isMultipleChoice ?? DEFAULT_DATA_POINT_FLAGS.isMultipleChoice,
    section: point.section ?? DEFAULT_DATA_POINT_FLAGS.section,
  };
}

export function normalizeCategoryConfig(
  config: Omit<CategoryTrackConfig, "dataPoints"> & {
    dataPoints: readonly DataPointDefinitionInput[];
  },
): CategoryTrackConfig {
  return {
    ...config,
    dataPoints: config.dataPoints.map(normalizeDataPoint),
  };
}

const MULTIPLE_CHOICE_ALIASES: Record<string, readonly string[]> = {
  lego: ["lego", "no-code", "no code", "nocode", "blocks", "block"],
  ai: ["ai", "ai dictation", "ai-assisted", "ai assisted", "artificial intelligence"],
  custom: ["custom", "code", "hand-coded", "hand coded", "from scratch", "scratch"],
  "2d flat": ["2d", "2d flat", "flat", "two dimensional", "2-d"],
  "3d space": ["3d", "3d space", "three dimensional", "3-d", "spatial"],
  "web browser": ["web", "browser", "web browser", "online", "webgl"],
  "mobile app": ["mobile", "phone", "ios", "android", "app store"],
  "desktop software": ["desktop", "pc", "steam", "executable", "native app"],
  "draw/model myself": ["draw", "model", "myself", "hand drawn", "self-made art"],
  "pre-made asset packs": ["asset pack", "asset packs", "premade", "pre-made", "store assets"],
  "ai generation tools": ["ai art", "ai tools", "ai generation", "midjourney", "stable diffusion"],
  "basic shapes and text": ["shapes", "primitives", "placeholder", "basic shapes", "rectangles"],
};

function normalizeChoiceText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function matchesChoiceOption(input: string, option: string): boolean {
  const normalizedInput = normalizeChoiceText(input);
  const normalizedOption = normalizeChoiceText(option);

  if (normalizedInput === normalizedOption) {
    return true;
  }

  if (
    normalizedInput.includes(normalizedOption) ||
    normalizedOption.includes(normalizedInput)
  ) {
    return true;
  }

  const aliases = MULTIPLE_CHOICE_ALIASES[normalizedOption];
  if (aliases) {
    return aliases.some(
      (alias) =>
        normalizedInput === alias ||
        normalizedInput.includes(alias) ||
        alias.includes(normalizedInput),
    );
  }

  return false;
}

export function matchMultipleChoiceInput(
  input: string,
  allowedValues: readonly string[],
): string | null {
  const trimmed = input.trim();
  if (!trimmed || allowedValues.length === 0) {
    return null;
  }

  for (const option of allowedValues) {
    if (matchesChoiceOption(trimmed, option)) {
      return option;
    }
  }

  return null;
}

export function allowedValuesToForcedChoices(
  allowedValues: readonly string[],
): ForcedChoices {
  const [first = "", second = first] = allowedValues;

  return {
    a: first,
    b: second,
    options: allowedValues.length > 0 ? [...allowedValues] : undefined,
  };
}

export function getForcedChoiceOptions(
  forcedChoices: ForcedChoices | null | undefined,
): readonly string[] {
  if (!forcedChoices) {
    return [];
  }

  if (forcedChoices.options && forcedChoices.options.length > 0) {
    return forcedChoices.options;
  }

  return [forcedChoices.a, forcedChoices.b].filter(Boolean);
}

export function isUserAcquisitionDataPoint(
  point: DataPointDefinition,
): boolean {
  return point.section === "user_acquisition";
}

export function isBackendGenerationDataPoint(
  point: DataPointDefinition,
): boolean {
  return point.section === "backend_generation";
}

export function getUserAcquisitionDataPoints(
  config: CategoryTrackConfig,
): readonly DataPointDefinition[] {
  return config.dataPoints.filter(isUserAcquisitionDataPoint);
}

export function getBackendGenerationDataPoints(
  config: CategoryTrackConfig,
): readonly DataPointDefinition[] {
  return config.dataPoints.filter(isBackendGenerationDataPoint);
}

export function configHasBackendGeneration(config: CategoryTrackConfig): boolean {
  return config.dataPoints.some(isBackendGenerationDataPoint);
}

export function isUserAcquisitionComplete(
  config: CategoryTrackConfig,
  extractedData: Record<string, string>,
): boolean {
  return getUserAcquisitionDataPoints(config).every((point) => {
    const value = extractedData[point.key];
    return typeof value === "string" && value.trim().length > 0;
  });
}

export function isBackendGenerationComplete(
  config: CategoryTrackConfig,
  extractedData: Record<string, string>,
): boolean {
  return getBackendGenerationDataPoints(config).every((point) => {
    const value = extractedData[point.key];
    return typeof value === "string" && value.trim().length > 0;
  });
}

export function getSection1Snapshot(
  config: CategoryTrackConfig,
  extractedData: Record<string, string>,
): Record<string, string> {
  const snapshot: Record<string, string> = {};
  for (const point of getUserAcquisitionDataPoints(config)) {
    const value = extractedData[point.key];
    if (typeof value === "string" && value.trim().length > 0) {
      snapshot[point.key] = value.trim();
    }
  }
  return snapshot;
}

export function buildActiveQuestionContext(
  config: CategoryTrackConfig,
  activeDataPointKey: string,
): ActiveQuestionContext | null {
  const activePoint = config.dataPoints.find((point) => point.key === activeDataPointKey);
  if (!activePoint || !isUserAcquisitionDataPoint(activePoint)) {
    return null;
  }

  const choiceOptions =
    activePoint.isMultipleChoice && activePoint.allowedValues
      ? activePoint.allowedValues
      : null;

  return {
    key: activePoint.key,
    isMultipleChoice: activePoint.isMultipleChoice,
    section: activePoint.section,
    choiceOptions,
  };
}
