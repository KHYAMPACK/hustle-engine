import {
  buildContextLockedInterrogationRules,
  buildCorePersonaIdentityBlock,
  buildLoggedIngredientsBlock,
  buildPersonaDeliveryChecklist,
  buildResourceConflictDirective,
  inferDomainWeight,
  type ResourceConflictContext,
} from "@/lib/ai/gauntlet/context-guardrails";
import {
  BASELINE_FIELD_ORDER,
  CATEGORY_FIELD_KEY,
  getExtractionFieldByKey,
  getFirstMissingPromptedField,
  getMissingPromptedFields,
  isExtractionComplete,
  isPromptedFieldKey,
  type ExtractionField,
} from "@/lib/ai/gauntlet/scoping-fields";
import type { OnboardingSessionState } from "@/lib/ai/gauntlet/types";

export type PassBPromptContext = {
  state: OnboardingSessionState;
  userMessage: string;
  conversationSummary: string;
  isOpening?: boolean;
  newlyCapturedKeys?: string[];
  suggestedNextFieldKey?: string | null;
  resourceConflict?: ResourceConflictContext;
};

function resolveConversationalFocusField(
  extractedData: OnboardingSessionState["extractedData"],
  suggestedNextFieldKey: string | null | undefined,
): ExtractionField | null {
  if (isExtractionComplete(extractedData)) {
    return null;
  }

  const suggestedKey = suggestedNextFieldKey?.trim();
  if (suggestedKey && isPromptedFieldKey(suggestedKey)) {
    const suggestedField = getExtractionFieldByKey(suggestedKey);
    if (suggestedField && !extractedData[suggestedKey]?.trim()) {
      return suggestedField;
    }
  }

  return getFirstMissingPromptedField(extractedData);
}

function buildPassAUpdatesBlock(newlyCapturedKeys: string[]): string {
  if (newlyCapturedKeys.length === 0) {
    return "No new fields logged by Pass A this turn.";
  }

  return newlyCapturedKeys
    .map((key) => {
      if (key === CATEGORY_FIELD_KEY) {
        return `- ${key}: background category weight updated (internal — do not mention taxonomy aloud)`;
      }

      const field = getExtractionFieldByKey(key);
      return `- ${field?.label ?? key}: newly captured`;
    })
    .join("\n");
}

function buildDynamicMissingBlock(
  extractedData: OnboardingSessionState["extractedData"],
): string {
  const missing = getMissingPromptedFields(extractedData);
  if (missing.length === 0) {
    return "All six core parameters are captured.";
  }

  return missing
    .map((field, index) => {
      const baselineRank = BASELINE_FIELD_ORDER.indexOf(field.key) + 1;
      return `${index + 1}. ${field.key} (baseline position ${baselineRank}): ${field.promptHint}`;
    })
    .join("\n");
}

function buildGoWithTheFlowBlock(
  extractedData: OnboardingSessionState["extractedData"],
  newlyCapturedKeys: string[],
  suggestedNextFieldKey: string | null | undefined,
  focusField: ExtractionField | null,
): string {
  const baselineFallback = getFirstMissingPromptedField(extractedData);
  const pivotSignal =
    suggestedNextFieldKey?.trim() &&
    isPromptedFieldKey(suggestedNextFieldKey) &&
    suggestedNextFieldKey !== baselineFallback?.key
      ? suggestedNextFieldKey
      : newlyCapturedKeys.length > 0
        ? "follow the thread opened in their latest message and Pass A updates"
        : null;

  const focusLine = focusField
    ? `Suggested single-threaded focus for your one question: ${focusField.key} — ${focusField.promptHint}`
    : "Suggested single-threaded focus: reflect the captured snapshot and invite corrections.";

  const fallbackLine = baselineFallback
    ? `Soft fallback when they have not set a direction: ${baselineFallback.key} (first gap in ${BASELINE_FIELD_ORDER.join(" -> ")})`
    : "Soft fallback: none — exploration complete.";

  const pivotLine = pivotSignal
    ? `Conversational pivot detected: ${pivotSignal}. Lean into that thread — do not drag them back to an earlier checklist slot just because it comes first in baseline order.`
    : "No pivot detected — baseline order is an acceptable guide for your one next question.";

  return `GO WITH THE FLOW DIALOGUE LOOP
- Café energy: two operators tossing ideas over coffee, not an intake desk. Match their pace and topic.
- Pass A updates this turn:
${buildPassAUpdatesBlock(newlyCapturedKeys)}
- Still missing (computed fresh each turn — never assume a fixed script):
${buildDynamicMissingBlock(extractedData)}
- ${pivotLine}
- ${focusLine}
- ${fallbackLine}
- Ask exactly one open question. Never double-prompt or stack multiple asks in one reply.`;
}

function buildEntrepreneurialToneBlock(): string {
  return `ENTREPRENEURIAL TONE (non-negotiable)
- Objective yet deeply collaborative — we are on the same side of the table.
- Use partner phrasing: we, let's, what if we — not auditor or examiner voice.
- Drop clinical frameworks, stage labels, intake-form field names, and bureaucratic routing language entirely.
- Sound like a street-smart co-founder who listens first and sharpens the idea second.`;
}

function buildOpeningTurnBlock(): string {
  return `OPENING TURN
No user message yet. Welcome them briefly — warm, no bureaucracy.
Invite them to walk you through what they are building and what they are working with. Let them choose where to start; do not impose a fixed question order.`;
}

function buildTurnMessageBlock(userMessage: string): string {
  return `LATEST USER MESSAGE
"""${userMessage || "(empty)"}"""`;
}

export function buildPassBPrompt(context: PassBPromptContext): string {
  const {
    state,
    userMessage,
    conversationSummary,
    isOpening,
    newlyCapturedKeys = [],
    suggestedNextFieldKey = null,
    resourceConflict = { detected: false, summary: null },
  } = context;

  const categoryKey = state.extractedData[CATEGORY_FIELD_KEY]?.trim() || undefined;
  const domainWeight = inferDomainWeight(categoryKey);
  const focusField = resolveConversationalFocusField(
    state.extractedData,
    suggestedNextFieldKey,
  );

  const turnBlock = isOpening
    ? buildOpeningTurnBlock()
    : buildTurnMessageBlock(userMessage);

  const completionBlock = isExtractionComplete(state.extractedData)
    ? `TURN GOAL
All core parameters are captured. Reflect the venture back in their words — concrete and human. Ask if anything needs adjusting before moving forward.`
    : "";

  const conflictBlock = buildResourceConflictDirective(resourceConflict);

  return `${buildCorePersonaIdentityBlock(categoryKey, domainWeight)}

${buildEntrepreneurialToneBlock()}

LOGGED INGREDIENTS (source of truth for names, numbers, and constraints)
${buildLoggedIngredientsBlock(state.extractedData)}

CONVERSATION SO FAR
${conversationSummary || "Fresh session."}

${turnBlock}

${isOpening ? "" : buildGoWithTheFlowBlock(state.extractedData, newlyCapturedKeys, suggestedNextFieldKey, focusField)}

${completionBlock}

${buildContextLockedInterrogationRules(
  state.extractedData,
  focusField,
  newlyCapturedKeys,
  domainWeight,
)}

${conflictBlock}

${buildPersonaDeliveryChecklist()}`;
}
