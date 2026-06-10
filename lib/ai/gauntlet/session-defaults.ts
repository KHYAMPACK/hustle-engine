import {
  CATEGORY_FIELD_KEY,
  isExtractionComplete,
  normalizeIncomingExtractionFieldKey,
  resolveActiveDataPoint,
  seedExtractedData,
} from "@/lib/ai/gauntlet/scoping-fields";
import {
  PENDING_CATEGORY,
  resolveClassifiedCategory,
} from "@/lib/ai/gauntlet/taxonomy";
import type { ExtractedData, GauntletStage, OnboardingSessionState } from "@/lib/ai/gauntlet/types";

/** Stage 1 — conversational scoping / field extraction. */
export const EXTRACTION_STAGE = 1 as const satisfies GauntletStage;

/** Stage 2 — metrics and blueprint generation once all six fields are captured. */
export const GENERATION_STAGE = 2 as const satisfies GauntletStage;

export function createPendingSessionState(
  projectId: string | null = null,
): OnboardingSessionState {
  const extractedData = seedExtractedData();

  return refreshSessionProgress({
    projectId,
    category: PENDING_CATEGORY,
    currentStage: EXTRACTION_STAGE,
    activeDataPoint: "",
    escalationAttempt: 1,
    isInputLocked: false,
    isCurrentFieldPredicted: false,
    extractedData,
    forcedChoices: null,
    activeException: null,
    backwardEditCount: 0,
  });
}

function syncCategoryColumn(state: OnboardingSessionState): OnboardingSessionState {
  const extractedData = seedExtractedData(state.extractedData);
  const rawCategory = extractedData[CATEGORY_FIELD_KEY]?.trim();
  const resolved = rawCategory ? resolveClassifiedCategory(rawCategory) : null;

  if (resolved) {
    return {
      ...state,
      category: resolved,
      extractedData: {
        ...extractedData,
        [CATEGORY_FIELD_KEY]: resolved,
      },
    };
  }

  return {
    ...state,
    category: PENDING_CATEGORY,
    extractedData,
  };
}

export function mergeExtractedFields(
  state: OnboardingSessionState,
  fields: Record<string, string | null | undefined>,
): OnboardingSessionState {
  const merged: ExtractedData = seedExtractedData(state.extractedData);

  for (const [rawKey, value] of Object.entries(fields)) {
    if (typeof value !== "string" || value.trim().length === 0) {
      continue;
    }

    const canonicalKey = normalizeIncomingExtractionFieldKey(rawKey);
    if (!canonicalKey) {
      continue;
    }

    const trimmed = value.trim();

    if (canonicalKey === CATEGORY_FIELD_KEY) {
      const resolved = resolveClassifiedCategory(trimmed);
      if (resolved) {
        merged[CATEGORY_FIELD_KEY] = resolved;
      }
      continue;
    }

    merged[canonicalKey] = trimmed;
  }

  return refreshSessionProgress({
    ...state,
    extractedData: merged,
  });
}

export function refreshSessionProgress(
  state: OnboardingSessionState,
  suggestedNextFieldKey?: string | null,
): OnboardingSessionState {
  const extractedData = seedExtractedData(state.extractedData);
  const extractionComplete = isExtractionComplete(extractedData);
  const activeDataPoint = resolveActiveDataPoint(
    extractedData,
    suggestedNextFieldKey ?? null,
  );

  return syncCategoryColumn({
    ...state,
    extractedData,
    activeDataPoint,
    currentStage: extractionComplete ? GENERATION_STAGE : EXTRACTION_STAGE,
    isInputLocked: false,
    forcedChoices: null,
    escalationAttempt: 1,
    activeException: null,
    isCurrentFieldPredicted: false,
  });
}
