import { Type } from "@google/genai";
import {
  buildMissingFieldsBlock,
  type ResourceConflictContext,
} from "@/lib/ai/gauntlet/context-guardrails";
import {
  buildExtractionFieldsPromptBlock,
  CATEGORY_FIELD_KEY,
  PROMPTED_FIELD_KEYS,
} from "@/lib/ai/gauntlet/scoping-fields";
import {
  buildTriageMatrixPromptBlock,
  BUSINESS_CATEGORY_IDS,
  resolveClassifiedCategory,
} from "@/lib/ai/gauntlet/taxonomy";
import type { OnboardingSessionState } from "@/lib/ai/gauntlet/types";
import { generateContentWithRetry } from "@/lib/ai/gemini-client";

export type UnifiedTurnAnalysis = {
  extractedFields: Record<string, string>;
  suggestedNextFieldKey: string | null;
  resourceConflict: ResourceConflictContext;
};

function buildUnifiedTurnPrompt(
  state: OnboardingSessionState,
  userMessage: string,
  conversationSummary: string,
): string {
  const categoryCaptured = Boolean(state.extractedData[CATEGORY_FIELD_KEY]?.trim());

  const classificationBlock = categoryCaptured
    ? `CATEGORY FIELD ("${CATEGORY_FIELD_KEY}")
- Already captured — do not change unless the latest user message explicitly corrects it.
- Return classifiedCategory as null.`
    : `CATEGORY FIELD ("${CATEGORY_FIELD_KEY}")
- Evaluate the pitch against the taxonomy matrix below.
- Return classifiedCategory as exactly one taxonomy key when keywords, intent, or structure clearly map to a track.
- Return null when the pitch is too sparse or lacks enough signal.
- Also mirror a confident classification into extractedFields.${CATEGORY_FIELD_KEY}.

TAXONOMY MATRIX (${BUSINESS_CATEGORY_IDS.length} tracks):
${buildTriageMatrixPromptBlock()}`;

  const knownValuesBlock =
    Object.entries(state.extractedData)
      .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
      .map(([key, value]) => `- ${key}: "${value.trim()}"`)
      .join("\n") || "None captured yet.";

  return `You are the unified analyst for a venture onboarding flow.
Temperature is zero. Return JSON only — never speak to the user.

${classificationBlock}

EXTRACTION FIELDS
${buildExtractionFieldsPromptBlock()}

STILL MISSING (prompted scoping slots only)
${buildMissingFieldsBlock(state.extractedData)}

ALREADY CAPTURED
${knownValuesBlock}

CONVERSATION SUMMARY
${conversationSummary || "First turn."}

LATEST USER MESSAGE
"""${userMessage}"""

EXTRACTION RULES
1. Scan the full conversation summary linearly — oldest to newest — and capture explicit statements only.
2. Populate extractedFields with clean, un-vetted string values when the user clearly stated them — regardless of which field they mention first.
3. Do not infer, guess, or rewrite user intent. Leave unknown slots absent from extractedFields — never fabricate boilerplate.
4. Never overwrite a known captured value unless the latest user message explicitly corrects it.
5. Category belongs in extractedFields only — inferred from the pitch, never asked as a questionnaire.

DYNAMIC NEXT FOCUS (suggestedNextFieldKey)
- Must be one of: ${PROMPTED_FIELD_KEYS.join(", ")}, or null when all prompted slots are filled.
- Choose based on conversational flow and what is still missing — NOT a fixed questionnaire order.
- Honor the user's entry point: if they led with time, budget, or scope, prioritize the missing field that best continues their thread.
- After they disclose a variable, prefer a missing field that logically cross-references what they just shared.

RESOURCE CONFLICT DETECTION
- Set resourceConflictDetected true only when logged or newly extracted scope/execution ambition clearly conflicts with logged or newly extracted time or budget constraints.
- conflictSummary must be one sentence referencing ONLY logged field values — no invented details or template scenarios.
- When true, suggestedNextFieldKey should target the missing slot that best resolves the tension.

Return JSON with:
- classifiedCategory: taxonomy key or null (only when category not yet captured)
- extractedFields: object mapping field keys to extracted string values
- suggestedNextFieldKey: missing prompted field key or null
- resourceConflictDetected: boolean
- conflictSummary: string or null`;
}

export async function runUnifiedTurnAnalysis(
  state: OnboardingSessionState,
  userMessage: string,
  conversationSummary: string,
): Promise<UnifiedTurnAnalysis> {
  const prompt = buildUnifiedTurnPrompt(state, userMessage, conversationSummary);
  const categoryCaptured = Boolean(state.extractedData[CATEGORY_FIELD_KEY]?.trim());

  const response = await generateContentWithRetry({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          classifiedCategory: { type: Type.STRING, nullable: true },
          extractedFields: { type: Type.OBJECT },
          suggestedNextFieldKey: { type: Type.STRING, nullable: true },
          resourceConflictDetected: { type: Type.BOOLEAN },
          conflictSummary: { type: Type.STRING, nullable: true },
        },
        required: [
          "classifiedCategory",
          "extractedFields",
          "suggestedNextFieldKey",
          "resourceConflictDetected",
          "conflictSummary",
        ],
      },
    },
  });

  const raw = response.text?.trim();
  if (!raw) {
    throw new Error("Unified turn analysis returned an empty payload.");
  }

  const parsed = JSON.parse(raw) as {
    classifiedCategory?: string | null;
    extractedFields?: Record<string, unknown>;
    suggestedNextFieldKey?: string | null;
    resourceConflictDetected?: boolean;
    conflictSummary?: string | null;
  };

  const extractedFields: Record<string, string> = {};

  if (parsed.extractedFields && typeof parsed.extractedFields === "object") {
    for (const [key, value] of Object.entries(parsed.extractedFields)) {
      if (typeof value === "string" && value.trim().length > 0) {
        extractedFields[key] = value.trim();
      }
    }
  }

  if (!categoryCaptured && parsed.classifiedCategory) {
    const resolved = resolveClassifiedCategory(parsed.classifiedCategory);
    if (resolved) {
      extractedFields[CATEGORY_FIELD_KEY] = resolved;
    }
  }

  const suggestedRaw = parsed.suggestedNextFieldKey?.trim() ?? null;
  const suggestedNextFieldKey =
    suggestedRaw && PROMPTED_FIELD_KEYS.includes(suggestedRaw) ? suggestedRaw : null;

  const resourceConflict: ResourceConflictContext = {
    detected: parsed.resourceConflictDetected === true,
    summary:
      typeof parsed.conflictSummary === "string" && parsed.conflictSummary.trim().length > 0
        ? parsed.conflictSummary.trim()
        : null,
  };

  return { extractedFields, suggestedNextFieldKey, resourceConflict };
}
