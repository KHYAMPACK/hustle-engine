import {
  buildContextLockedInterrogationRules,
  buildCorePersonaIdentityBlock,
  buildLoggedIngredientsBlock,
  buildMissingFieldsBlock,
  buildPersonaDeliveryChecklist,
  buildResourceConflictDirective,
  inferDomainWeight,
  type ResourceConflictContext,
} from "@/lib/ai/gauntlet/context-guardrails";
import {
  CATEGORY_FIELD_KEY,
  getExtractionFieldByKey,
  isExtractionComplete,
} from "@/lib/ai/gauntlet/scoping-fields";
import type { OnboardingSessionState } from "@/lib/ai/gauntlet/types";
import { generateContentWithRetry } from "@/lib/ai/gemini-client";

export type PersonaResponseContext = {
  state: OnboardingSessionState;
  userMessage: string;
  conversationSummary: string;
  isOpening?: boolean;
  newlyCapturedKeys?: string[];
  resourceConflict?: ResourceConflictContext;
};

function buildFreshCaptureBlock(
  state: OnboardingSessionState,
  newlyCapturedKeys: string[],
): string {
  if (newlyCapturedKeys.length === 0) {
    return "Nothing new logged this turn — lean on their latest message and prior ingredients.";
  }

  const lines = newlyCapturedKeys
    .map((key) => {
      if (key === CATEGORY_FIELD_KEY) {
        return "- background category weight updated (internal — do not mention aloud)";
      }

      const value = state.extractedData[key]?.trim();
      if (!value) {
        return null;
      }

      const label = getExtractionFieldByKey(key)?.label ?? key;
      return `- ${label}: "${value}"`;
    })
    .filter(Boolean);

  return lines.length > 0
    ? lines.join("\n")
    : "Nothing new logged this turn — lean on their latest message and prior ingredients.";
}

function buildNextTurnDirective(state: OnboardingSessionState): string {
  if (isExtractionComplete(state.extractedData)) {
    return `TURN GOAL
All core parameters are captured. Reflect back the venture in their words — concrete, specific, human. Ask if anything needs adjusting before moving forward.`;
  }

  return `TURN GOAL
One missing parameter remains in the active focal slot below. Acknowledge what landed, then ask a single domain-native question to fill that gap.`;
}

function buildOpeningTurnBlock(): string {
  return `OPENING TURN
No user message yet. Welcome them like a co-founder would — brief, warm, no bureaucracy.
Invite them to walk you through what they're building and what they're working with. Let them lead the order.`;
}

function buildPersonaPrompt(context: PersonaResponseContext): string {
  const {
    state,
    userMessage,
    conversationSummary,
    isOpening,
    newlyCapturedKeys = [],
    resourceConflict = { detected: false, summary: null },
  } = context;

  const categoryKey = state.extractedData[CATEGORY_FIELD_KEY]?.trim() || undefined;
  const domainWeight = inferDomainWeight(categoryKey);
  const activeField = getExtractionFieldByKey(state.activeDataPoint) ?? null;

  const turnBlock = isOpening
    ? buildOpeningTurnBlock()
    : `LATEST USER MESSAGE
"""${userMessage || "(empty)"}"""`;

  const conflictBlock = buildResourceConflictDirective(resourceConflict);

  return `${buildCorePersonaIdentityBlock(categoryKey, domainWeight)}

LOGGED INGREDIENTS (source of truth for names, numbers, and constraints)
${buildLoggedIngredientsBlock(state.extractedData)}

STILL TO EXPLORE
${buildMissingFieldsBlock(state.extractedData)}

CONVERSATION SO FAR
${conversationSummary || "Fresh session."}

${turnBlock}

JUST CAPTURED THIS TURN
${buildFreshCaptureBlock(state, newlyCapturedKeys)}

${buildNextTurnDirective(state)}

${buildContextLockedInterrogationRules(
  state.extractedData,
  activeField,
  newlyCapturedKeys,
  domainWeight,
)}

${conflictBlock}

${buildPersonaDeliveryChecklist()}`;
}

export async function runPersonaResponse(
  context: PersonaResponseContext,
): Promise<string> {
  const prompt = buildPersonaPrompt(context);

  const response = await generateContentWithRetry({
    model: "gemini-2.5-flash-lite",
    contents: prompt,
    config: {
      temperature: 0.7,
    },
  });

  const text = response.text?.trim();
  if (!text) {
    if (context.isOpening) {
      return "Hey — pull up a chair. Walk me through what you're building and what you're starting with. We'll stress-test it together.";
    }

    if (isExtractionComplete(context.state.extractedData)) {
      return "I think we've got a solid read on this. Anything you'd tweak before we keep going?";
    }

    return "Got it — tell me a bit more so we can keep shaping this in your world, not mine.";
  }

  return text;
}
