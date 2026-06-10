import {
  CATEGORY_FIELD_KEY,
  resolveActiveDataPoint,
  seedExtractedData,
} from "@/lib/ai/gauntlet/scoping-fields";
import {
  PENDING_CATEGORY,
  resolveClassifiedCategory,
} from "@/lib/ai/gauntlet/taxonomy";
import type { ExtractedData, OnboardingSessionState } from "@/lib/ai/gauntlet/types";

export function createPendingSessionState(
  projectId: string | null = null,
): OnboardingSessionState {
  const extractedData = seedExtractedData();

  return refreshSessionProgress({
    projectId,
    category: PENDING_CATEGORY,
    currentStage: 1,
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
  const rawCategory = state.extractedData[CATEGORY_FIELD_KEY]?.trim();
  const resolved = rawCategory ? resolveClassifiedCategory(rawCategory) : null;

  if (resolved) {
    return {
      ...state,
      category: resolved,
      extractedData: {
        ...state.extractedData,
        [CATEGORY_FIELD_KEY]: resolved,
      },
    };
  }

  return {
    ...state,
    category: PENDING_CATEGORY,
  };
}

export function mergeExtractedFields(
  state: OnboardingSessionState,
  fields: Record<string, string | null | undefined>,
): OnboardingSessionState {
  const merged: ExtractedData = seedExtractedData(state.extractedData);

  for (const [key, value] of Object.entries(fields)) {
    if (typeof value !== "string" || value.trim().length === 0) {
      continue;
    }

    if (key === CATEGORY_FIELD_KEY) {
      const resolved = resolveClassifiedCategory(value);
      if (resolved) {
        merged[CATEGORY_FIELD_KEY] = resolved;
      }
      continue;
    }

    merged[key] = value.trim();
  }

  return syncCategoryColumn({ ...state, extractedData: merged });
}

export function refreshSessionProgress(
  state: OnboardingSessionState,
  suggestedNextFieldKey?: string | null,
): OnboardingSessionState {
  const extractedData = seedExtractedData(state.extractedData);
  const activeDataPoint = resolveActiveDataPoint(
    extractedData,
    suggestedNextFieldKey ?? null,
  );

  return syncCategoryColumn({
    ...state,
    extractedData,
    activeDataPoint,
    currentStage: 1,
    isInputLocked: false,
    forcedChoices: null,
    escalationAttempt: 1,
    activeException: null,
    isCurrentFieldPredicted: false,
  });
}
