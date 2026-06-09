import { Type } from "@google/genai";
import {
  buildExtractionFieldsPromptBlock,
  CATEGORY_FIELD_KEY,
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

ALREADY CAPTURED
${knownValuesBlock}

CONVERSATION SUMMARY
${conversationSummary || "First turn."}

LATEST USER MESSAGE
"""${userMessage}"""

EXTRACTION RULES
1. Scan the full conversation summary linearly — oldest to newest — and capture explicit statements only.
2. Populate extractedFields with clean, un-vetted string values for project_type, skill_level, available_time, and budget when the user clearly stated them.
3. Do not infer, guess, or rewrite user intent. Skip fields with no direct evidence.
4. Never overwrite a known captured value unless the latest user message explicitly corrects it.
5. Category belongs in extractedFields only — it is inferred from the pitch, never asked as a questionnaire.

Return JSON with:
- classifiedCategory: taxonomy key or null (only when category not yet captured)
- extractedFields: object mapping field keys to extracted string values`;
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
        },
        required: ["classifiedCategory", "extractedFields"],
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

  return { extractedFields };
}
