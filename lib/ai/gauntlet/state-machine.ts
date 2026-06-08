import {
  getCategoryConfig,
  getDataPointByKey,
  getDependentKeysAfter,
  getFoundationKeys,
  getNextUnpopulatedDataPoint,
  getStageForDataPoint,
  isFoundationComplete,
  listRegisteredCategories,
  resolveClassifiedCategory,
} from "@/lib/ai/gauntlet/category-registry";
import type {
  CategoryTrackConfig,
  EscalationAttempt,
  ForcedChoices,
  GauntletException,
  OnboardingSessionState,
  PassAAnalysis,
} from "@/lib/ai/gauntlet/types";

const VAGUE_QUALIFIERS =
  /\b(anyone|everyone|everybody|people|users|customers|small businesses?|businesses?|companies?|folks|someone|something|stuff|things|maybe|probably|kind of|sort of|etc\.?)\b/i;

const DEFAULT_ESCALATION_FORCED_CHOICES: ForcedChoices = {
  a: "Double down on the immediate, high-pain group we just discussed.",
  b: "Pivot to a completely separate alternative angle to test first.",
};

const BUDGET_AMBITION_FORCED_CHOICES: ForcedChoices = {
  a: "Scale the build down to match the budget and hours we actually have.",
  b: "Increase budget or weekly hours before we commit to this heavier build path.",
};

function resolveForcedChoices(
  incoming: ForcedChoices | null | undefined,
  fallback: ForcedChoices = DEFAULT_ESCALATION_FORCED_CHOICES,
): ForcedChoices {
  if (incoming?.options?.length) {
    return {
      a: incoming.a.trim(),
      b: incoming.b.trim(),
      options: incoming.options,
    };
  }

  if (incoming?.a?.trim() && incoming?.b?.trim()) {
    return { a: incoming.a.trim(), b: incoming.b.trim() };
  }

  return fallback;
}

export function isVagueValue(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 12) {
    return true;
  }
  if (VAGUE_QUALIFIERS.test(trimmed) && trimmed.split(/\s+/).length < 18) {
    return true;
  }
  return false;
}

export function mergeExtractedFields(
  current: OnboardingSessionState["extractedData"],
  incoming: Record<string, string | null>,
): {
  merged: OnboardingSessionState["extractedData"];
  newlyPopulated: string[];
} {
  const merged = { ...current };
  const newlyPopulated: string[] = [];

  for (const [key, value] of Object.entries(incoming)) {
    if (typeof value !== "string" || value.trim().length === 0) {
      continue;
    }

    if (!merged[key] || merged[key] !== value.trim()) {
      merged[key] = value.trim();
      newlyPopulated.push(key);
    }
  }

  return { merged, newlyPopulated };
}

export function clearDependentFields(
  extractedData: OnboardingSessionState["extractedData"],
  config: CategoryTrackConfig,
  fromKey: string,
): OnboardingSessionState["extractedData"] {
  const dependentKeys = getDependentKeysAfter(config, fromKey);
  const next = { ...extractedData };

  for (const key of dependentKeys) {
    delete next[key];
  }

  return next;
}

export type StateTransitionResult = {
  state: OnboardingSessionState;
  exceptionScript: GauntletException;
  newlySkippedKeys: string[];
  resolvedActiveValue: string | null;
};

export function syncActiveDataPointPredictionFlag(
  state: OnboardingSessionState,
  config: CategoryTrackConfig,
): OnboardingSessionState {
  const activePoint = getDataPointByKey(config, state.activeDataPoint);
  if (!activePoint) {
    return { ...state, isCurrentFieldPredicted: false };
  }

  return {
    ...state,
    isCurrentFieldPredicted:
      activePoint.generationMode === "ai_predict" && !activePoint.isMultipleChoice,
  };
}

function finalizeTransition(
  state: OnboardingSessionState,
  config: CategoryTrackConfig,
  partial: Partial<OnboardingSessionState>,
  result: Omit<StateTransitionResult, "state">,
): StateTransitionResult {
  return {
    ...result,
    state: syncActiveDataPointPredictionFlag({ ...state, ...partial }, config),
  };
}

export function applyPassAToState(
  previous: OnboardingSessionState,
  passA: PassAAnalysis,
  config: CategoryTrackConfig,
  forcedChoiceSelection?: "a" | "b",
): StateTransitionResult {
  let state: OnboardingSessionState = { ...previous, activeException: null };
  let exceptionScript: GauntletException = null;
  let resolvedActiveValue: string | null = null;

  if (passA.twoIdeasConflict) {
    return finalizeTransition(
      state,
      config,
      {
        activeException: "two_ideas",
        isInputLocked: false,
        forcedChoices: null,
      },
      {
        exceptionScript: "two_ideas",
        newlySkippedKeys: [],
        resolvedActiveValue: null,
      },
    );
  }

  if (passA.categoryDrift) {
    return finalizeTransition(
      state,
      config,
      {
        activeException: "category_drift",
        isInputLocked: false,
        forcedChoices: null,
      },
      {
        exceptionScript: "category_drift",
        newlySkippedKeys: [],
        resolvedActiveValue: null,
      },
    );
  }

  if (passA.budgetAmbitionParadox) {
    return finalizeTransition(
      state,
      config,
      {
        activeException: "budget_ambition_paradox",
        isInputLocked: true,
        forcedChoices: resolveForcedChoices(
          passA.forcedChoices,
          BUDGET_AMBITION_FORCED_CHOICES,
        ),
        escalationAttempt: 3,
      },
      {
        exceptionScript: "budget_ambition_paradox",
        newlySkippedKeys: [],
        resolvedActiveValue: null,
      },
    );
  }

  if (passA.prematureStageJump && !isFoundationComplete(config, state.extractedData)) {
    return finalizeTransition(
      state,
      config,
      {
        activeException: "premature_jump",
        escalationAttempt: 1,
        isInputLocked: false,
        forcedChoices: null,
      },
      {
        exceptionScript: "premature_jump",
        newlySkippedKeys: [],
        resolvedActiveValue: null,
      },
    );
  }

  if (passA.pivotDetected) {
    const foundationKeys = getFoundationKeys(config);
    const pivotKey = foundationKeys.includes(state.activeDataPoint)
      ? state.activeDataPoint
      : foundationKeys[0];

    state = {
      ...state,
      extractedData: clearDependentFields(state.extractedData, config, pivotKey),
      activeException: "pivot_reset",
      escalationAttempt: 1,
      isInputLocked: false,
      forcedChoices: null,
      activeDataPoint: pivotKey ?? state.activeDataPoint,
      currentStage: 1,
    };
    exceptionScript = "pivot_reset";
  }

  if (passA.backwardEditRequest) {
    if (state.backwardEditCount >= 1) {
      return finalizeTransition(
        state,
        config,
        {
          activeException: "circular_pivot",
          isInputLocked: true,
          forcedChoices: resolveForcedChoices(passA.forcedChoices),
          escalationAttempt: 3,
        },
        {
          exceptionScript: "circular_pivot",
          newlySkippedKeys: [],
          resolvedActiveValue: null,
        },
      );
    }

    state = {
      ...state,
      backwardEditCount: state.backwardEditCount + 1,
      escalationAttempt: 1,
      isInputLocked: false,
      forcedChoices: null,
    };
  }

  if (passA.detectedCategory) {
    const resolved = resolveClassifiedCategory(passA.detectedCategory);
    if (
      resolved &&
      resolved !== state.category &&
      listRegisteredCategories().includes(resolved)
    ) {
      const nextConfig = getCategoryConfig(resolved);
      const firstPoint = nextConfig.dataPoints[0];
      state = {
        ...state,
        category: resolved,
        extractedData: {},
        escalationAttempt: 1,
        isInputLocked: false,
        forcedChoices: null,
        currentStage: firstPoint?.stage ?? 1,
        activeDataPoint: firstPoint?.key ?? state.activeDataPoint,
      };
    }
  }

  const { merged, newlyPopulated } = mergeExtractedFields(
    state.extractedData,
    passA.extractedFields,
  );
  state.extractedData = merged;

  const skippedFromMerge = newlyPopulated.filter((key) => key !== state.activeDataPoint);
  const newlySkippedKeys = [...new Set([...passA.skippedFieldKeys, ...skippedFromMerge])];

  if (forcedChoiceSelection && state.forcedChoices) {
    resolvedActiveValue =
      forcedChoiceSelection === "a"
        ? state.forcedChoices.a
        : state.forcedChoices.b;
    state.extractedData[state.activeDataPoint] = resolvedActiveValue;
    state.escalationAttempt = 1;
    state.isInputLocked = false;
    state.forcedChoices = null;
  } else if (
    (passA.activeDataPointQuality === "specific" ||
      passA.activeDataPointQuality === "clear") &&
    passA.activeDataPointValue
  ) {
    resolvedActiveValue = passA.activeDataPointValue.trim();
    state.extractedData[state.activeDataPoint] = resolvedActiveValue;
    state.escalationAttempt = 1;
    state.isInputLocked = false;
    state.forcedChoices = null;
  } else if (passA.activeDataPointQuality === "forced_choice") {
    // Wait for UI selection — keep locked state from pass A.
    return finalizeTransition(
      state,
      config,
      {
        escalationAttempt: 3,
        isInputLocked: true,
        forcedChoices: resolveForcedChoices(passA.forcedChoices),
      },
      {
        exceptionScript,
        newlySkippedKeys,
        resolvedActiveValue: null,
      },
    );
  } else if (passA.activeDataPointQuality === "vague") {
    const nextAttempt = Math.min(3, state.escalationAttempt + 1) as EscalationAttempt;

    if (nextAttempt === 3) {
      return finalizeTransition(
        state,
        config,
        {
          escalationAttempt: 3,
          isInputLocked: true,
          forcedChoices: resolveForcedChoices(passA.forcedChoices),
        },
        {
          exceptionScript,
          newlySkippedKeys,
          resolvedActiveValue: null,
        },
      );
    }

    state.escalationAttempt = nextAttempt;
    state.isInputLocked = false;
    state.forcedChoices = null;
  }

  if (resolvedActiveValue || skippedFromMerge.includes(state.activeDataPoint)) {
    const nextPoint = getNextUnpopulatedDataPoint(config, state.extractedData);
    if (nextPoint) {
      state.activeDataPoint = nextPoint.key;
      state.currentStage = nextPoint.stage;
      state.escalationAttempt = 1;
      state.isInputLocked = false;
      state.forcedChoices = null;
    }
  } else if (
    state.escalationAttempt === 1 &&
    passA.activeDataPointQuality === "empty" &&
    !passA.activeDataPointValue
  ) {
    const activePoint = getDataPointByKey(config, state.activeDataPoint);
    if (activePoint && state.extractedData[state.activeDataPoint]) {
      const nextPoint = getNextUnpopulatedDataPoint(config, state.extractedData);
      if (nextPoint) {
        state.activeDataPoint = nextPoint.key;
        state.currentStage = nextPoint.stage;
      }
    }
  }

  if (
    !isFoundationComplete(config, state.extractedData) &&
    getStageForDataPoint(config, state.activeDataPoint) > 1
  ) {
    const nextFoundation = getNextUnpopulatedDataPoint(config, state.extractedData, 1);
    if (nextFoundation?.isFoundation) {
      state.activeDataPoint = nextFoundation.key;
      state.currentStage = nextFoundation.stage;
      state.escalationAttempt = 1;
    }
  }

  return finalizeTransition(state, config, {}, {
    exceptionScript,
    newlySkippedKeys,
    resolvedActiveValue,
  });
}

export function createInitialSessionState(
  projectId: string | null = null,
): OnboardingSessionState {
  return {
    projectId,
    category: "pending",
    currentStage: 1,
    activeDataPoint: "pitch",
    escalationAttempt: 1,
    isInputLocked: false,
    isCurrentFieldPredicted: false,
    extractedData: {},
    forcedChoices: null,
    activeException: null,
    backwardEditCount: 0,
  };
}
