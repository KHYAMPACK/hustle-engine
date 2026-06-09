export type ExtractionField = {
  key: string;
  label: string;
  promptHint: string;
};

export const CATEGORY_FIELD_KEY = "category" as const;

/** Conversational prompt order — category is inferred, not asked directly. */
export const PROMPTED_EXTRACTION_FIELDS: readonly ExtractionField[] = [
  {
    key: "project_type",
    label: "Project Type",
    promptHint:
      "What they are building — product format, delivery model, or business shape in plain language.",
  },
  {
    key: "skill_level",
    label: "Skill Level",
    promptHint:
      "Their relevant experience — technical, creative, or operational skill they bring to this build.",
  },
  {
    key: "available_time",
    label: "Available Time",
    promptHint:
      "Realistic weekly hours they can commit — include ranges or schedules if mentioned.",
  },
  {
    key: "budget",
    label: "Budget",
    promptHint:
      "Cash they can spend on tools, inventory, ads, or build costs — include ranges if vague.",
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

export function getFirstMissingPromptedField(
  extractedData: Record<string, string>,
): ExtractionField | null {
  for (const field of PROMPTED_EXTRACTION_FIELDS) {
    const value = extractedData[field.key];
    if (!value || value.trim().length === 0) {
      return field;
    }
  }
  return null;
}

export function isExtractionComplete(
  extractedData: Record<string, string>,
): boolean {
  return getFirstMissingPromptedField(extractedData) === null;
}

export function buildExtractionFieldsPromptBlock(): string {
  const prompted = PROMPTED_EXTRACTION_FIELDS.map(
    (field) =>
      `- ${field.key} (${field.label}): ${field.promptHint}`,
  ).join("\n");

  return `${prompted}
- ${CATEGORY_FIELD_KEY} (Business Category): Infer from pitch using taxonomy when intent is clear — store the taxonomy key only, never ask the user to pick a track.`;
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
