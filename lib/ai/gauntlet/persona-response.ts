import {
  CATEGORY_FIELD_KEY,
  getExtractionFieldByKey,
  getFirstMissingPromptedField,
  isExtractionComplete,
} from "@/lib/ai/gauntlet/scoping-fields";
import { getCustomerModelLanguage } from "@/lib/ai/gauntlet/taxonomy";
import type { OnboardingSessionState } from "@/lib/ai/gauntlet/types";
import { TAXONOMY_FORBIDDEN_PHRASES } from "@/lib/ai/gauntlet/types";
import { generateContentWithRetry } from "@/lib/ai/gemini-client";

export type PersonaResponseContext = {
  state: OnboardingSessionState;
  userMessage: string;
  conversationSummary: string;
  isOpening?: boolean;
  newlyCapturedKeys?: string[];
};

function buildCapturedSummary(
  state: OnboardingSessionState,
  newlyCapturedKeys: string[],
): string {
  if (newlyCapturedKeys.length === 0) {
    return "Nothing new was captured from the latest message.";
  }

  const lines = newlyCapturedKeys
    .map((key) => {
      if (key === CATEGORY_FIELD_KEY) {
        return null;
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
    : "Nothing new was captured from the latest message.";
}

function buildNextQuestionDirective(state: OnboardingSessionState): string {
  if (isExtractionComplete(state.extractedData)) {
    return `NEXT PROMPT
- All four scoping fields are captured.
- Briefly reflect the picture you have of their venture.
- Ask if they want to adjust anything or move forward with planning.`;
  }

  const missingField = getFirstMissingPromptedField(state.extractedData);
  if (!missingField) {
    return `NEXT PROMPT
- Ask what they are building in plain language.`;
  }

  return `NEXT PROMPT
- Ask for their ${missingField.label} in natural, conversational language.
- Hint to capture: ${missingField.promptHint}
- One question only — do not stack multiple asks.`;
}

function buildPersonaPrompt(context: PersonaResponseContext): string {
  const { state, userMessage, conversationSummary, isOpening, newlyCapturedKeys = [] } =
    context;

  const categoryId = state.extractedData[CATEGORY_FIELD_KEY]?.trim();
  const customerModelLanguage = categoryId
    ? getCustomerModelLanguage(categoryId)
    : "A venture we're mapping together";

  const openingBlock = isOpening
    ? `OPENING TURN
- No user message yet. Deliver a warm, concise welcome.
- Invite them to pitch the business idea in their own words.
- Do not ask for all variables at once.`
    : `USER MESSAGE
"""${userMessage || "(empty)"}"""`;

  return `You are a supportive venture-building partner in a conversational onboarding chat.
You speak like a sharp co-founder — encouraging, direct, and practical.

FORBIDDEN LANGUAGE (never use these words or reveal internal routing):
${TAXONOMY_FORBIDDEN_PHRASES.join(", ")}

CUSTOMER MODEL (internal compass — describe the idea using this shape, never quote taxonomy codes):
${customerModelLanguage}

CONVERSATION SUMMARY
${conversationSummary || "Fresh session."}

${openingBlock}

JUST CAPTURED THIS TURN
${buildCapturedSummary(state, newlyCapturedKeys)}

${buildNextQuestionDirective(state)}

STYLE RULES
1. Two short paragraphs max — validate what landed, then ask the next question.
2. Never mention stages, schemas, data points, classification tracks, or attempt numbers.
3. Never disable free-text input or demand they pick from fixed options.
4. Plain text only — no markdown lists or bullet characters.`;
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
      return "Hey — I'm here to help you stress-test a business idea. Pitch me what you're building, who it's for, and what you're working with.";
    }

    const missingField = getFirstMissingPromptedField(context.state.extractedData);
    if (missingField) {
      return `Thanks for sharing that. What would you say your ${missingField.label.toLowerCase()} looks like for this project?`;
    }

    return "We've got a solid snapshot. Want to tweak anything before we move forward?";
  }

  return text;
}
