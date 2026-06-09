import { getMessageText } from "@/lib/chat-utils";
import {
  getCategoryConfig,
  getDataPointByKey,
  getNextUnpopulatedDataPoint,
  tryGetCategoryConfig,
} from "@/lib/ai/gauntlet/category-registry";
import { buildActiveQuestionContext } from "@/lib/ai/gauntlet/data-point-utils";
import { ensureDynamicContextAnchor } from "@/lib/ai/gauntlet/dynamic-context-anchor";
import {
  emptyPassAAnalysis,
  runBackendDerivationPassA,
  runPassAAnalyst,
  runTriagePassA,
} from "@/lib/ai/gauntlet/pass-a-analyst";
import {
  buildOpeningPassBContext,
  runPassBPersona,
} from "@/lib/ai/gauntlet/pass-b-persona";
import { applyPassAToState } from "@/lib/ai/gauntlet/state-machine";
import {
  applyTriagePassAToState,
  PENDING_ACTIVE_DATA_POINT,
} from "@/lib/ai/gauntlet/triage";
import type {
  CategoryTrackConfig,
  GauntletChatResponse,
  GauntletException,
  OnboardingSessionState,
  PassAAnalysis,
} from "@/lib/ai/gauntlet/types";
import { EXCEPTION_SCRIPTS } from "@/lib/ai/gauntlet/types";
import { isPendingCategory } from "@/lib/ai/gauntlet/taxonomy";
import type { UIMessage } from "ai";

function summarizeConversation(messages: UIMessage[]): string {
  return messages
    .slice(-8)
    .map((message) => {
      const text = getMessageText(message).trim();
      if (!text) {
        return null;
      }
      return `${message.role}: ${text.slice(0, 400)}`;
    })
    .filter(Boolean)
    .join("\n");
}

function getLastUserMessage(messages: UIMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === "user") {
      return getMessageText(message).trim();
    }
  }
  return "";
}

function buildGauntletResponse(
  message: string,
  state: OnboardingSessionState,
): GauntletChatResponse {
  const categoryConfig = tryGetCategoryConfig(state.category);
  const activeQuestion = categoryConfig
    ? buildActiveQuestionContext(categoryConfig, state.activeDataPoint)
    : null;

  return {
    message,
    state,
    forcedChoices: state.forcedChoices,
    isInputLocked: state.isInputLocked,
    activeQuestion,
  };
}

export type ProcessGauntletTurnInput = {
  messages: UIMessage[];
  session: OnboardingSessionState;
  forcedChoice?: "a" | "b";
};

async function applyBackendDerivationIfReady(
  state: OnboardingSessionState,
  config: CategoryTrackConfig,
  conversationSummary: string,
): Promise<OnboardingSessionState> {
  const derived = await runBackendDerivationPassA(
    config,
    state.extractedData,
    conversationSummary,
  );

  if (Object.keys(derived).length === 0) {
    return state;
  }

  return {
    ...state,
    extractedData: { ...state.extractedData, ...derived },
  };
}

export async function processGauntletTurn(
  input: ProcessGauntletTurnInput,
): Promise<{ response: GauntletChatResponse; session: OnboardingSessionState }> {
  const { messages, forcedChoice } = input;
  let state = { ...input.session };
  const userMessage = getLastUserMessage(messages);
  const conversationSummary = summarizeConversation(messages);

  if (!userMessage && !forcedChoice) {
    const openingContext = buildOpeningPassBContext(state);
    const message = await runPassBPersona(openingContext);

    return {
      response: buildGauntletResponse(message, state),
      session: state,
    };
  }

  if (isPendingCategory(state.category) && userMessage && !forcedChoice) {
    const triage = await runTriagePassA(userMessage, conversationSummary);
    const triageTransition = applyTriagePassAToState(state, triage);
    state = triageTransition.state;

    if (triage.isSplitParadoxDetected) {
      return {
        response: buildGauntletResponse(EXCEPTION_SCRIPTS.two_ideas, state),
        session: state,
      };
    }

    if (!triageTransition.triageCompleted) {
      const message = await runPassBPersona({
        state,
        categoryConfig: null,
        passA: emptyPassAAnalysis(),
        userMessage,
        conversationSummary,
        exceptionScript: null,
        nextDataPoint: null,
        newlySkippedKeys: [],
        resolvedActiveValue: null,
        triageInvalidPitch: triageTransition.triageInvalidPitch,
      });

      return {
        response: buildGauntletResponse(message, state),
        session: state,
      };
    }

    const categoryConfig = getCategoryConfig(state.category);
    const passAActiveDataPointKey = state.activeDataPoint;
    const passA = await runPassAAnalyst(
      state,
      userMessage,
      conversationSummary,
      categoryConfig,
    );
    const transition = applyPassAToState(state, passA, categoryConfig);
    state = transition.state;
    state = await applyBackendDerivationIfReady(
      state,
      categoryConfig,
      conversationSummary,
    );
    state = await ensureDynamicContextAnchor(
      state,
      categoryConfig,
      conversationSummary,
    );

    const message = await runPassBPersona({
      state,
      categoryConfig,
      passA,
      passAActiveDataPointKey,
      userMessage,
      conversationSummary,
      exceptionScript: transition.exceptionScript,
      nextDataPoint:
        getNextUnpopulatedDataPoint(categoryConfig, state.extractedData) ??
        getDataPointByKey(categoryConfig, state.activeDataPoint) ??
        null,
      newlySkippedKeys: transition.newlySkippedKeys,
      resolvedActiveValue: transition.resolvedActiveValue,
      triageJustCompleted: true,
    });

    return {
      response: buildGauntletResponse(message, state),
      session: state,
    };
  }

  const categoryConfig = getCategoryConfig(state.category);

  let passA: PassAAnalysis;
  if (forcedChoice && state.isInputLocked && state.forcedChoices) {
    passA = {
      activeDataPointQuality: "specific",
      activeDataPointValue:
        forcedChoice === "a" ? state.forcedChoices.a : state.forcedChoices.b,
      extractedFields: {},
      skippedFieldKeys: [],
      detectedCategory: null,
      categoryDrift: false,
      twoIdeasConflict: false,
      pivotDetected: false,
      budgetAmbitionParadox: false,
      prematureStageJump: false,
      backwardEditRequest: false,
      forcedChoices: null,
    };
  } else {
    passA = await runPassAAnalyst(
      state,
      userMessage,
      conversationSummary,
      categoryConfig,
    );
  }

  const forcedChoiceLabel =
    forcedChoice && input.session.forcedChoices
      ? forcedChoice === "a"
        ? input.session.forcedChoices.a
        : input.session.forcedChoices.b
      : null;

  const passAActiveDataPointKey = state.activeDataPoint;
  const transition = applyPassAToState(
    state,
    passA,
    categoryConfig,
    forcedChoice,
  );
  state = transition.state;
  state = await applyBackendDerivationIfReady(
    state,
    categoryConfig,
    conversationSummary,
  );

  const activeConfig = getCategoryConfig(state.category);
  state = await ensureDynamicContextAnchor(
    state,
    activeConfig,
    conversationSummary,
  );

  const nextDataPoint =
    getNextUnpopulatedDataPoint(activeConfig, state.extractedData) ??
    getDataPointByKey(activeConfig, state.activeDataPoint) ??
    null;

  const exceptionScript: GauntletException =
    transition.exceptionScript ?? state.activeException;

  const message = await runPassBPersona({
    state,
    categoryConfig: activeConfig,
    passA,
    passAActiveDataPointKey,
    userMessage: forcedChoiceLabel ?? userMessage,
    conversationSummary,
    exceptionScript,
    nextDataPoint,
    newlySkippedKeys: transition.newlySkippedKeys,
    resolvedActiveValue: transition.resolvedActiveValue,
  });

  return {
    response: buildGauntletResponse(message, state),
    session: state,
  };
}
