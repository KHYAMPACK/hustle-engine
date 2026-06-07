import {
  getCategoryConfig,
  getFirstDataPoint,
  initializeExtractedDataForCategory,
  resolveClassifiedCategory,
} from "@/lib/ai/gauntlet/category-registry";
import { syncActiveDataPointPredictionFlag } from "@/lib/ai/gauntlet/state-machine";
import type {
  GauntletException,
  OnboardingSessionState,
  TriagePassAAnalysis,
} from "@/lib/ai/gauntlet/types";
import { PENDING_CATEGORY } from "@/lib/ai/gauntlet/taxonomy";

export const PENDING_ACTIVE_DATA_POINT = "pitch";

export type TriageTransitionResult = {
  state: OnboardingSessionState;
  exceptionScript: GauntletException;
  triageCompleted: boolean;
  triageInvalidPitch: boolean;
};

export function createPendingSessionState(
  projectId: string | null = null,
): OnboardingSessionState {
  return {
    projectId,
    category: PENDING_CATEGORY,
    currentStage: 1,
    activeDataPoint: PENDING_ACTIVE_DATA_POINT,
    escalationAttempt: 1,
    isInputLocked: false,
    isCurrentFieldPredicted: false,
    extractedData: {},
    forcedChoices: null,
    activeException: null,
    backwardEditCount: 0,
  };
}

export function applyTriagePassAToState(
  previous: OnboardingSessionState,
  triage: TriagePassAAnalysis,
): TriageTransitionResult {
  let state: OnboardingSessionState = { ...previous, activeException: null };

  if (triage.isSplitParadoxDetected) {
    return {
      state: {
        ...state,
        category: PENDING_CATEGORY,
        activeDataPoint: PENDING_ACTIVE_DATA_POINT,
        activeException: "two_ideas",
        isInputLocked: false,
        isCurrentFieldPredicted: false,
        forcedChoices: null,
        escalationAttempt: 1,
      },
      exceptionScript: "two_ideas",
      triageCompleted: false,
      triageInvalidPitch: false,
    };
  }

  if (!triage.isPitchValid) {
    return {
      state: {
        ...state,
        category: PENDING_CATEGORY,
        activeDataPoint: PENDING_ACTIVE_DATA_POINT,
        isInputLocked: false,
        isCurrentFieldPredicted: false,
        forcedChoices: null,
        escalationAttempt: 1,
      },
      exceptionScript: null,
      triageCompleted: false,
      triageInvalidPitch: true,
    };
  }

  const resolvedCategory = resolveClassifiedCategory(triage.classifiedCategory);
  if (!resolvedCategory) {
    return {
      state: {
        ...state,
        category: PENDING_CATEGORY,
        activeDataPoint: PENDING_ACTIVE_DATA_POINT,
        isInputLocked: false,
        isCurrentFieldPredicted: false,
        forcedChoices: null,
      },
      exceptionScript: null,
      triageCompleted: false,
      triageInvalidPitch: true,
    };
  }

  const config = getCategoryConfig(resolvedCategory);
  const firstPoint = getFirstDataPoint(config);

  state = syncActiveDataPointPredictionFlag(
    {
      ...state,
      category: resolvedCategory,
      currentStage: 1,
      activeDataPoint: firstPoint.key,
      escalationAttempt: 1,
      isInputLocked: false,
      forcedChoices: null,
      extractedData: initializeExtractedDataForCategory(config),
      activeException: null,
      backwardEditCount: 0,
    },
    config,
  );

  return {
    state,
    exceptionScript: null,
    triageCompleted: true,
    triageInvalidPitch: false,
  };
}
