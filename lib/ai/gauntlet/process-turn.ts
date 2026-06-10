import { getMessageText } from "@/lib/chat-utils";
import { runPersonaResponse } from "@/lib/ai/gauntlet/persona-response";
import {
  getExtractionFieldByKey,
  isExtractionComplete,
} from "@/lib/ai/gauntlet/scoping-fields";
import {
  mergeExtractedFields,
  refreshSessionProgress,
} from "@/lib/ai/gauntlet/session-defaults";
import { applyStructuralFieldFallback } from "@/lib/ai/gauntlet/state-machine";
import { runUnifiedTurnAnalysis } from "@/lib/ai/gauntlet/unified-turn";
import type {
  ActiveQuestionContext,
  GauntletChatResponse,
  OnboardingSessionState,
} from "@/lib/ai/gauntlet/types";
import type { UIMessage } from "ai";

function summarizeConversation(messages: UIMessage[]): string {
  return messages
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

function buildActiveQuestion(
  state: OnboardingSessionState,
): ActiveQuestionContext | null {
  if (isExtractionComplete(state.extractedData)) {
    return null;
  }

  const activeField = getExtractionFieldByKey(state.activeDataPoint);
  if (!activeField) {
    return null;
  }

  return {
    key: activeField.key,
    isMultipleChoice: false,
    section: "user_acquisition",
    choiceOptions: null,
  };
}

function buildGauntletResponse(
  message: string,
  state: OnboardingSessionState,
): GauntletChatResponse {
  return {
    message,
    state,
    forcedChoices: null,
    isInputLocked: false,
    activeQuestion: buildActiveQuestion(state),
  };
}

function detectNewlyCapturedKeys(
  before: OnboardingSessionState,
  after: OnboardingSessionState,
): string[] {
  const keys = new Set([
    ...Object.keys(before.extractedData),
    ...Object.keys(after.extractedData),
  ]);

  const newlyCaptured: string[] = [];
  for (const key of keys) {
    const previous = before.extractedData[key]?.trim() ?? "";
    const current = after.extractedData[key]?.trim() ?? "";
    if (current && current !== previous) {
      newlyCaptured.push(key);
    }
  }

  return newlyCaptured;
}

export type ProcessGauntletTurnInput = {
  messages: UIMessage[];
  session: OnboardingSessionState;
  forcedChoice?: "a" | "b";
};

export async function processGauntletTurn(
  input: ProcessGauntletTurnInput,
): Promise<{ response: GauntletChatResponse; session: OnboardingSessionState }> {
  const { messages } = input;
  let state = refreshSessionProgress({ ...input.session });
  const userMessage = getLastUserMessage(messages);
  const conversationSummary = summarizeConversation(messages);

  if (!userMessage) {
    const message = await runPersonaResponse({
      state,
      userMessage: "",
      conversationSummary,
      isOpening: true,
    });

    return {
      response: buildGauntletResponse(message, state),
      session: state,
    };
  }

  const snapshotBeforeMerge = state;
  const analysis = await runUnifiedTurnAnalysis(
    state,
    userMessage,
    conversationSummary,
  );

  if (Object.keys(analysis.extractedFields).length > 0) {
    state = mergeExtractedFields(state, analysis.extractedFields);
  }

  state = applyStructuralFieldFallback(
    state,
    userMessage,
    analysis.extractedFields,
  );

  state = refreshSessionProgress(state);

  const newlyCapturedKeys = detectNewlyCapturedKeys(
    snapshotBeforeMerge,
    state,
  );

  const message = await runPersonaResponse({
    state,
    userMessage,
    conversationSummary,
    newlyCapturedKeys,
    suggestedNextFieldKey: analysis.suggestedNextFieldKey,
    resourceConflict: analysis.resourceConflict,
  });

  return {
    response: buildGauntletResponse(message, state),
    session: state,
  };
}
