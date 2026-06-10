export type ExtractionRelationalRole =
  | "scope"
  | "outcome"
  | "risk"
  | "execution"
  | "time_constraint"
  | "budget_constraint";

export type ExtractionField = {
  key: string;
  label: string;
  promptHint: string;
  relationalRole: ExtractionRelationalRole;
};

/** Canonical key for the primary business category slot. */
export const CATEGORY_FIELD_KEY = "category" as const;

/**
 * Baseline progression order — out-of-order capture is allowed, but the active
 * tracker always anchors to the first empty slot in this sequence.
 */
export const PROMPTED_EXTRACTION_FIELDS: readonly ExtractionField[] = [
  {
    key: "category",
    label: "Category",
    promptHint:
      "Primary business or industry category — infer from pitch using taxonomy when intent is clear; store the taxonomy key only.",
    relationalRole: "scope",
  },
  {
    key: "end_goal",
    label: "End Goal",
    promptHint:
      "Where the user wants this project to end — the long-term target outcome they are building toward.",
    relationalRole: "outcome",
  },
  {
    key: "assumption",
    label: "Assumption",
    promptHint:
      "The single most critical dependency or belief that could break the plan if it turns out wrong.",
    relationalRole: "risk",
  },
  {
    key: "skills",
    label: "Skills",
    promptHint:
      "Whether they already have the skills to execute, plan to learn, or intend to hire external help.",
    relationalRole: "execution",
  },
  {
    key: "available_time",
    label: "Available Time",
    promptHint:
      "Weekly hours they can realistically allocate to building — include ranges or schedule limits if stated.",
    relationalRole: "time_constraint",
  },
  {
    key: "budget",
    label: "Budget",
    promptHint:
      "Financial runway or out-of-pocket setup capital available — ranges allowed if vague.",
    relationalRole: "budget_constraint",
  },
] as const;

export const PROMPTED_FIELD_KEYS = PROMPTED_EXTRACTION_FIELDS.map(
  (field) => field.key,
) as readonly string[];

export const BASELINE_FIELD_ORDER = PROMPTED_FIELD_KEYS;

/** Common Pass A key variants mapped to canonical six-field schema keys. */
export const EXTRACTION_FIELD_KEY_ALIASES = {
  category: ["business_category", "type", "track"],
  end_goal: ["goal", "target", "long_term_goal", "endGoal"],
  assumption: ["risk", "wrong", "failure_point", "dependency"],
  skills: ["skill", "experience", "hiring", "team"],
  available_time: ["time", "weekly_hours", "hours", "availableTime", "weeklyTime"],
  budget: ["money", "capital", "runway", "funding", "cost_limit"],
} as const satisfies Record<(typeof PROMPTED_FIELD_KEYS)[number], readonly string[]>;

function camelToSnakeCase(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();
}

function registerAliasLookup(
  lookup: Record<string, string>,
  canonical: string,
  alias: string,
): void {
  lookup[alias.toLowerCase()] = canonical;
  lookup[camelToSnakeCase(alias).toLowerCase()] = canonical;
}

const EXTRACTION_FIELD_ALIAS_LOOKUP: Record<string, string> = {};

for (const canonicalKey of PROMPTED_FIELD_KEYS) {
  registerAliasLookup(EXTRACTION_FIELD_ALIAS_LOOKUP, canonicalKey, canonicalKey);
}

for (const [canonicalKey, aliases] of Object.entries(EXTRACTION_FIELD_KEY_ALIASES)) {
  for (const alias of aliases) {
    registerAliasLookup(EXTRACTION_FIELD_ALIAS_LOOKUP, canonicalKey, alias);
  }
}

/** Map analyst or merge payloads to a strict schema key, or null when unmappable. */
export function normalizeIncomingExtractionFieldKey(rawKey: string): string | null {
  const trimmed = rawKey.trim();
  if (!trimmed) {
    return null;
  }

  if (isPromptedFieldKey(trimmed)) {
    return trimmed;
  }

  const snakeKey = camelToSnakeCase(trimmed);
  if (isPromptedFieldKey(snakeKey)) {
    return snakeKey;
  }

  return (
    EXTRACTION_FIELD_ALIAS_LOOKUP[trimmed.toLowerCase()] ??
    EXTRACTION_FIELD_ALIAS_LOOKUP[snakeKey.toLowerCase()] ??
    null
  );
}

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
  _suggestedKey?: string | null,
): string {
  const firstMissing = getFirstMissingPromptedField(extractedData);
  if (firstMissing) {
    return firstMissing.key;
  }

  return PROMPTED_EXTRACTION_FIELDS[PROMPTED_EXTRACTION_FIELDS.length - 1].key;
}

export function buildExtractionFieldsPromptBlock(): string {
  return PROMPTED_EXTRACTION_FIELDS.map(
    (field) =>
      `- ${field.key} (${field.label}; role: ${field.relationalRole}): ${field.promptHint}`,
  ).join("\n");
}

export function seedExtractedData(
  extractedData: Record<string, string> = {},
): Record<string, string> {
  const next: Record<string, string> = { ...extractedData };

  for (const field of PROMPTED_EXTRACTION_FIELDS) {
    const raw = next[field.key];
    next[field.key] = typeof raw === "string" ? raw : "";
  }

  return next;
}
