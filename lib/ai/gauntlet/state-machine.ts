import { normalizeIncomingExtractionFieldKey } from "@/lib/ai/gauntlet/scoping-fields";
import { mergeExtractedFields } from "@/lib/ai/gauntlet/session-defaults";
import type { OnboardingSessionState } from "@/lib/ai/gauntlet/types";

const AVAILABLE_TIME_KEY = "available_time";
const BUDGET_KEY = "budget";

const TIME_WITH_WEEK_PATTERN =
  /(\d+(?:\.\d+)?)\s*(?:hrs?|hours?|h)\s*(?:\/\s*|(?:\bper\b|\ba\b)\s+(?:the\s*)?)(?:week|wk|weekly)\b/i;

const TIME_WITH_WEEK_CONTEXT_PATTERN =
  /\b(?:\/\s*week|per\s+week|a\s+week|weekly)\b/i;

const TIME_HOURS_ONLY_PATTERN = /(\d+(?:\.\d+)?)\s*(?:hrs?|hours?|h)\b/i;

const BUDGET_PATTERNS: readonly {
  pattern: RegExp;
  format: (match: RegExpMatchArray) => string;
}[] = [
  {
    pattern: /\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(k|K)?\b/,
    format: (match) => (match[2] ? `$${match[1]}${match[2]}` : `$${match[1]}`),
  },
  {
    pattern: /€\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(k|K)?\b/,
    format: (match) => (match[2] ? `€${match[1]}${match[2]}` : `€${match[1]}`),
  },
  {
    pattern: /£\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(k|K)?\b/,
    format: (match) => (match[2] ? `£${match[1]}${match[2]}` : `£${match[1]}`),
  },
  {
    pattern: /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(k|K)\b/,
    format: (match) => `${match[1]}k`,
  },
  {
    pattern: /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(usd|dollars?|bucks?)\b/i,
    format: (match) => `${match[1]} ${match[2].toLowerCase()}`,
  },
];

function passAIncludedField(
  passAExtractedFields: Record<string, string>,
  canonicalKey: string,
): boolean {
  for (const rawKey of Object.keys(passAExtractedFields)) {
    if (normalizeIncomingExtractionFieldKey(rawKey) === canonicalKey) {
      return true;
    }
  }

  return false;
}

export function extractLocalAvailableTime(userMessage: string): string | null {
  const trimmed = userMessage.trim();
  if (!trimmed) {
    return null;
  }

  const directMatch = trimmed.match(TIME_WITH_WEEK_PATTERN);
  if (directMatch) {
    return `${directMatch[1]} hours/week`;
  }

  if (TIME_WITH_WEEK_CONTEXT_PATTERN.test(trimmed)) {
    const hoursMatch = trimmed.match(TIME_HOURS_ONLY_PATTERN);
    if (hoursMatch) {
      return `${hoursMatch[1]} hours/week`;
    }
  }

  return null;
}

export function extractLocalBudget(userMessage: string): string | null {
  const trimmed = userMessage.trim();
  if (!trimmed) {
    return null;
  }

  for (const { pattern, format } of BUDGET_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      return format(match);
    }
  }

  return null;
}

/**
 * Secondary structural check — fills time/budget slots Pass A omitted when the
 * user message contains clear numeric markers.
 */
export function applyStructuralFieldFallback(
  state: OnboardingSessionState,
  userMessage: string,
  passAExtractedFields: Record<string, string>,
): OnboardingSessionState {
  const trimmedMessage = userMessage.trim();
  if (!trimmedMessage) {
    return state;
  }

  const fallbackFields: Record<string, string> = {};

  if (
    !passAIncludedField(passAExtractedFields, AVAILABLE_TIME_KEY) &&
    !state.extractedData[AVAILABLE_TIME_KEY]?.trim()
  ) {
    const availableTime = extractLocalAvailableTime(trimmedMessage);
    if (availableTime) {
      fallbackFields[AVAILABLE_TIME_KEY] = availableTime;
    }
  }

  if (
    !passAIncludedField(passAExtractedFields, BUDGET_KEY) &&
    !state.extractedData[BUDGET_KEY]?.trim()
  ) {
    const budget = extractLocalBudget(trimmedMessage);
    if (budget) {
      fallbackFields[BUDGET_KEY] = budget;
    }
  }

  if (Object.keys(fallbackFields).length === 0) {
    return state;
  }

  return mergeExtractedFields(state, fallbackFields);
}
