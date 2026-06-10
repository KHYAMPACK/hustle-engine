import { Type } from "@google/genai";
import { buildMissingFieldsBlock, type ResourceConflictContext } from "@/lib/ai/gauntlet/context-guardrails";
import {
  buildExtractionFieldsPromptBlock,
  CATEGORY_FIELD_KEY,
  getExtractionFieldByKey,
  isExtractionComplete,
  PROMPTED_FIELD_KEYS,
} from "@/lib/ai/gauntlet/scoping-fields";
import {
  buildTriageMatrixPromptBlock,
  BUSINESS_CATEGORY_IDS,
  resolveClassifiedCategory,
} from "@/lib/ai/gauntlet/taxonomy";
import type { OnboardingSessionState } from "@/lib/ai/gauntlet/types";
import { generateContentWithRetry } from "@/lib/ai/gemini-client";

export type PassAAnalysisResult = {
  extractedFields: Record<string, string>;
  suggestedNextFieldKey: string | null;
  resourceConflict: ResourceConflictContext;
};

function coerceExtractedFieldValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return null;
    }
    return String(value);
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "object") {
    if (Array.isArray(value) || Object.keys(value as object).length === 0) {
      return null;
    }
    return null;
  }

  return null;
}

/** Type coercion layer for analyst JSON field maps before merge/persistence. */
export function normalizeAnalystExtractedFields(
  raw: unknown,
): Record<string, string> {
  if (raw === null || raw === undefined || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const coerced = coerceExtractedFieldValue(value);
    if (coerced !== null) {
      normalized[key] = coerced;
    }
  }

  return normalized;
}

export function parseBackendDerivationPassAPayload(
  rawPayload: unknown,
): Record<string, string> {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
    return {};
  }

  const derivedFields = (rawPayload as { derivedFields?: unknown }).derivedFields;
  return normalizeAnalystExtractedFields(derivedFields);
}

function applyClassifiedCategoryToFields(
  extractedFields: Record<string, string>,
  classifiedCategory: unknown,
  categoryCaptured: boolean,
): Record<string, string> {
  if (categoryCaptured || !classifiedCategory) {
    return extractedFields;
  }

  const resolved = resolveClassifiedCategory(
    typeof classifiedCategory === "string" ? classifiedCategory : String(classifiedCategory),
  );

  if (!resolved) {
    return extractedFields;
  }

  return {
    ...extractedFields,
    [CATEGORY_FIELD_KEY]: resolved,
  };
}

function parsePassAAnalystPayload(
  payload: unknown,
  categoryCaptured: boolean,
): PassAAnalysisResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      extractedFields: {},
      suggestedNextFieldKey: null,
      resourceConflict: { detected: false, summary: null },
    };
  }

  const parsed = payload as {
    classifiedCategory?: unknown;
    extractedFields?: unknown;
    suggestedNextFieldKey?: unknown;
    resourceConflictDetected?: unknown;
    conflictSummary?: unknown;
  };

  const extractedFields = applyClassifiedCategoryToFields(
    normalizeAnalystExtractedFields(parsed.extractedFields),
    parsed.classifiedCategory,
    categoryCaptured,
  );

  const suggestedRaw = coerceExtractedFieldValue(parsed.suggestedNextFieldKey);
  const suggestedNextFieldKey =
    suggestedRaw && PROMPTED_FIELD_KEYS.includes(suggestedRaw) ? suggestedRaw : null;

  const conflictSummary = coerceExtractedFieldValue(parsed.conflictSummary);

  return {
    extractedFields,
    suggestedNextFieldKey,
    resourceConflict: {
      detected: parsed.resourceConflictDetected === true,
      summary: conflictSummary,
    },
  };
}

const PASS_A_RESPONSE_SCHEMA = {
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
} as const;

export async function runPassAAnalyst(
  state: OnboardingSessionState,
  userMessage: string,
  conversationSummary: string,
): Promise<PassAAnalysisResult> {
  const prompt = buildStandardPassAPrompt(state, userMessage, conversationSummary);
  const categoryCaptured = Boolean(state.extractedData[CATEGORY_FIELD_KEY]?.trim());

  const response = await generateContentWithRetry({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: PASS_A_RESPONSE_SCHEMA,
    },
  });

  const raw = response.text?.trim();
  if (!raw) {
    throw new Error("Pass A analyst returned an empty payload.");
  }

  return parsePassAAnalystPayload(JSON.parse(raw), categoryCaptured);
}

export async function runBackendDerivationPassA(
  state: OnboardingSessionState,
  _conversationSummary: string,
): Promise<Record<string, string>> {
  if (!isExtractionComplete(state.extractedData)) {
    return {};
  }

  // Six-field scoping model: no live backend derivation call yet.
  return {};
}

function buildCategoryClassificationBlock(categoryCaptured: boolean): string {
  if (categoryCaptured) {
    return `CATEGORY FIELD ("${CATEGORY_FIELD_KEY}")
- Already captured — do not change unless the latest user message explicitly corrects it.
- Return classifiedCategory as null.`;
  }

  return `CATEGORY FIELD ("${CATEGORY_FIELD_KEY}")
- Evaluate the pitch against the taxonomy matrix below.
- Return classifiedCategory as exactly one taxonomy key when keywords, intent, or structure clearly map to a track.
- Return null when the pitch is too sparse or lacks enough signal.
- Also mirror a confident classification into extractedFields.${CATEGORY_FIELD_KEY}.

TAXONOMY MATRIX (${BUSINESS_CATEGORY_IDS.length} tracks):
${buildTriageMatrixPromptBlock()}`;
}

function buildSpecificityCriteriaBlock(): string {
  return PROMPTED_FIELD_KEYS.map((key) => {
    const field = getExtractionFieldByKey(key);
    if (!field) {
      return "";
    }

    switch (key) {
      case "category":
        return `- ${key}: SPECIFIC when the pitch maps to one taxonomy track with recognizable product, service, platform, or business intent. VAGUE when there is no classifiable business signal — omit from extractedFields; do not store placeholder guesses.`;
      case "end_goal":
        return `- ${key}: SPECIFIC when the user names a concrete destination — revenue band, audience size, launch milestone, exit shape, or measurable success marker tied to this venture. VAGUE when only aspirational fluff ("make money", "be successful", "grow") with no anchor — omit.`;
      case "assumption":
        return `- ${key}: SPECIFIC when they name one critical dependency or belief that could break the plan if wrong — market demand, channel access, regulation, co-founder, platform policy, supply chain, etc. VAGUE when hand-wavy ("hope it works", "should be fine") with no identifiable risk — omit.`;
      case "skills":
        return `- ${key}: SPECIFIC when they state capability clearly — existing skills, learning plan with domain, or explicit hire/outsource intent. VAGUE when deferral without substance ("I'll figure it out", "I know some stuff") — omit.`;
      case "available_time":
        return `- ${key}: SPECIFIC when weekly hours, schedule band, or time commitment is stated — numeric ranges, evenings-only, full-time, etc. VAGUE when time is acknowledged but no usable quantity ("not much", "when I can") — omit.`;
      case "budget":
        return `- ${key}: SPECIFIC when capital, runway, or out-of-pocket setup spend is stated — dollar amounts, ranges, bootstrap/$0, or months of runway. VAGUE when money is acknowledged but no usable anchor ("limited budget", "not much") — omit.`;
      default:
        return `- ${key}: SPECIFIC only when the user's words satisfy: ${field.promptHint}. VAGUE otherwise — omit from extractedFields.`;
    }
  })
    .filter(Boolean)
    .join("\n");
}

export function buildStandardPassAPrompt(
  state: OnboardingSessionState,
  userMessage: string,
  conversationSummary: string,
): string {
  const categoryCaptured = Boolean(state.extractedData[CATEGORY_FIELD_KEY]?.trim());
  const activeField = getExtractionFieldByKey(state.activeDataPoint);
  const activeFocusLine = activeField
    ? `Active conversational thread focus (baseline tracker): ${activeField.key} — ${activeField.promptHint}`
    : "Active conversational thread focus: all six core slots are captured — scan for corrections only.";

  const knownValuesBlock =
    Object.entries(state.extractedData)
      .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
      .map(([key, value]) => `- ${key}: "${value.trim()}"`)
      .join("\n") || "None captured yet.";

  return `You are Pass A — the background analyst for a venture onboarding flow.
Temperature is zero. Return JSON only — never speak to the user.

${buildCategoryClassificationBlock(categoryCaptured)}

SIMULTANEOUS MULTI-FIELD EXTRACTION
- Scan the ENTIRE latest user message and the full conversation summary for evidence belonging to ANY of the six core tracking fields: ${PROMPTED_FIELD_KEYS.join(", ")}.
- Users may dump multiple facts in one reply or jump ahead (e.g., budget before category is locked). Extract every field they clearly supplied in that message — not only the active focus.
- When one response contains evidence for multiple fields, populate ALL of them in extractedFields in the same JSON return. Never extract only the active field while ignoring co-located facts.
- Out-of-order capture is expected and valid. Filling a downstream field does NOT mean upstream slots failed — leave unmentioned slots absent rather than marking them vague.

${activeFocusLine}

CORE TRACKING FIELDS
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
1. Read linearly across the conversation summary (oldest to newest) plus the latest message. Capture explicit user statements only.
2. Populate extractedFields with clean string values when specificity criteria are met — any field may be filled regardless of baseline order.
3. Use exact snake_case keys: ${PROMPTED_FIELD_KEYS.join(", ")}.
4. Evaluate the active conversational thread focus for context, but stay hyper-flexible: if the user intentionally pivots to a different missing field, extract that value cleanly instead of treating the active field as failed, vague, or empty.
5. Do not infer, guess, or rewrite user intent. Omit unknown or weak slots from extractedFields — never fabricate boilerplate or store vague placeholders.
6. Never overwrite a known captured value unless the latest user message explicitly corrects it.

SPECIFIC vs VAGUE (strict — when VAGUE, omit the key entirely from extractedFields)
${buildSpecificityCriteriaBlock()}

DYNAMIC NEXT FOCUS (suggestedNextFieldKey)
- Must be one of: ${PROMPTED_FIELD_KEYS.join(", ")}, or null when all six slots are filled.
- Baseline progression for the active tracker: category -> end_goal -> assumption -> skills -> available_time -> budget.
- Prefer the earliest still-missing slot in that baseline unless the user's latest message clearly engages a different missing field — then suggest that engaged field.
- Extraction remains out-of-order; suggestedNextFieldKey only guides conversational focus.

RESOURCE CONFLICT DETECTION
- Set resourceConflictDetected true only when logged or newly extracted scope/execution ambition clearly conflicts with logged or newly extracted time or budget constraints.
- conflictSummary must be one sentence referencing ONLY logged field values — no invented details or template scenarios.
- When true, suggestedNextFieldKey should target the missing slot that best resolves the tension.

Return JSON with:
- classifiedCategory: taxonomy key or null (only when category not yet captured)
- extractedFields: object mapping field keys to extracted string values (may contain multiple keys from one turn)
- suggestedNextFieldKey: missing prompted field key or null
- resourceConflictDetected: boolean
- conflictSummary: string or null`;
}
