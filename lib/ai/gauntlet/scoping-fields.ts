export type ExtractionField = {
  key: string;
  label: string;
  promptHint: string;
  /** Meta role for context-locked cross-referencing — not user-facing copy. */
  relationalRole: "scope" | "execution" | "time_constraint" | "budget_constraint";
};

export const CATEGORY_FIELD_KEY = "category" as const;

export const PROMPTED_EXTRACTION_FIELDS: readonly ExtractionField[] = [
  {
    key: "validation_goal",
    label: "Validation Goal",
    promptHint:
      "The simplest, non-financial milestone or action to prove their core loop works before heavy infrastructure setup.",
    relationalRole: "execution", // Links perfectly to your operational execution path!
  },
  {
    key: "available_time",
    label: "Available Time",
    promptHint:
      "Realistic weekly focus hours they can commit to executing this venture — check for schedules or limitations.",
    relationalRole: "time_constraint",
  },
  {
    key: "budget",
    label: "Budget",
    promptHint:
      "Out-of-pocket capital limits they can spend on initial setup, tools, or launch costs — ranges allowed if vague.",
    relationalRole: "budget_constraint",
  },
] as const;

export const PROMPTED_FIELD_KEYS = PROMPTED_EXTRACTION_FIELDS.map(
  (field) => field.key,
) as readonly string[];

export function getExtractionFieldByKey(
  key: string,
): ExtractionField | undefined {
  return PROMPTED_EXTRACTION_FIELDS.find((field) => field.key === key);
}

export function isPromptedFieldKey(key: string): boolean {
  return PROMPTED_FIELD_KEYS.includes(key);
}

export function getMissingPromptedFields(
  extractedData: Record<string, string>,
): ExtractionField[] {
  return PROMPTED_EXTRACTION_FIELDS.filter((field) => {
    const value = extractedData[field.key];
    return !value || value.trim().length === 0;
  });
}

/** @deprecated Use getMissingPromptedFields — no fixed conversational order. */
export function getFirstMissingPromptedField(
  extractedData: Record<string, string>,
): ExtractionField | null {
  return getMissingPromptedFields(extractedData)[0] ?? null;
}

export function isExtractionComplete(
  extractedData: Record<string, string>,
): boolean {
  return getMissingPromptedFields(extractedData).length === 0;
}

export function resolveActiveDataPoint(
  extractedData: Record<string, string>,
  suggestedKey: string | null | undefined,
): string {
  const missing = getMissingPromptedFields(extractedData);
  if (missing.length === 0) {
    return PROMPTED_EXTRACTION_FIELDS[PROMPTED_EXTRACTION_FIELDS.length - 1].key;
  }

  if (suggestedKey && isPromptedFieldKey(suggestedKey)) {
    const match = missing.find((field) => field.key === suggestedKey);
    if (match) {
      return match.key;
    }
  }

  return missing[0].key;
}

export function buildExtractionFieldsPromptBlock(): string {
  const prompted = PROMPTED_EXTRACTION_FIELDS.map(
    (field) =>
      `- ${field.key} (${field.label}; role: ${field.relationalRole}): ${field.promptHint}`,
  ).join("\n");

  return `${prompted}
- ${CATEGORY_FIELD_KEY} (Business Category; role: scope): Infer from pitch using taxonomy when intent is clear — store the taxonomy key only, never ask the user to pick a track.`;
}

export function seedExtractedData(
  extractedData: Record<string, string> = {},
): Record<string, string> {
  const next = { ...extractedData };

  for (const field of PROMPTED_EXTRACTION_FIELDS) {
    if (!(field.key in next)) {
      next[field.key] = "";
    }
  }

  if (!(CATEGORY_FIELD_KEY in next)) {
    next[CATEGORY_FIELD_KEY] = "";
  }

  return next;
}
