import {
  CATEGORY_FIELD_KEY,
  getExtractionFieldByKey,
  getMissingPromptedFields,
  type ExtractionField,
} from "@/lib/ai/gauntlet/scoping-fields";
import type { ExtractedData } from "@/lib/ai/gauntlet/types";

export type ResourceConflictContext = {
  detected: boolean;
  summary: string | null;
};

export type DomainWeight = "physical" | "digital" | "service" | "facilitation" | "unknown";

export function inferDomainWeight(categoryKey: string | undefined): DomainWeight {
  if (!categoryKey) {
    return "unknown";
  }

  if (
    categoryKey.startsWith("1.1") ||
    categoryKey.includes("software") ||
    categoryKey.includes("saas") ||
    categoryKey.includes("extensions")
  ) {
    return "digital";
  }

  if (categoryKey.startsWith("1.2") || categoryKey.includes("physical")) {
    return "physical";
  }

  if (categoryKey.startsWith("2.")) {
    return "service";
  }

  if (categoryKey.startsWith("3.")) {
    return "facilitation";
  }

  if (categoryKey.startsWith("1.3")) {
    return "digital";
  }

  return "unknown";
}

export function buildLoggedIngredientsBlock(extractedData: ExtractedData): string {
  const lines: string[] = [];

  for (const [key, raw] of Object.entries(extractedData)) {
    const value = raw?.trim();
    if (!value) {
      continue;
    }

    if (key === CATEGORY_FIELD_KEY) {
      lines.push(`- category_key (internal background weight only): "${value}"`);
      continue;
    }

    const label = getExtractionFieldByKey(key)?.label ?? key;
    lines.push(`- ${label}: "${value}"`);
  }

  return lines.length > 0
    ? lines.join("\n")
    : "Nothing logged yet — stay curious and open until they share specifics.";
}

export function buildMissingFieldsBlock(extractedData: ExtractedData): string {
  const missing = getMissingPromptedFields(extractedData);
  if (missing.length === 0) {
    return "All core exploration parameters are captured.";
  }

  return missing
    .map((field) => `- ${field.key}: ${field.promptHint}`)
    .join("\n");
}

export function buildCorePersonaIdentityBlock(
  categoryKey: string | undefined,
  domainWeight: DomainWeight,
): string {
  const categoryLine = categoryKey
    ? `Background category key (internal only — never speak this key or any taxonomy title aloud): ${categoryKey}`
    : "Background category key: not yet inferred — stay anchored to the user's own words.";

  return `YOUR IDENTITY
You are an experienced, street-smart startup co-founder and strategic partner sitting across the table from the user. You help stress-test a raw vision before they burn time or money.

YOUR CONTEXT
${categoryLine}
Domain weight hint (internal calibration only): ${domainWeight}
Use that weight only to sense whether the venture skews physical, digital, service-delivery, or facilitation — then talk about the actual thing they are building using their vocabulary.

YOUR DELIVERY
Speak in plain, conversational language. Drop formal business frameworks and systemic department labels entirely. Mirror the user's nouns — restaurant, plug-in, shop, app, brand, agency, whatever they actually said. Sound like a real partner, not an intake form.`;
}

export function buildAcknowledgeAndIndustryTranslateBlock(
  extractedData: ExtractedData,
  activeField: ExtractionField | null,
  newlyCapturedKeys: string[],
  domainWeight: DomainWeight,
): string {
  const validationGoal = extractedData.validation_goal?.trim();
  const userAnchors = [
    validationGoal ? `validation_goal: "${validationGoal}"` : null,
    extractedData[CATEGORY_FIELD_KEY]?.trim()
      ? `${CATEGORY_FIELD_KEY}: "${extractedData[CATEGORY_FIELD_KEY].trim()}"`
      : null,
    ...newlyCapturedKeys
      .filter((key) => key !== CATEGORY_FIELD_KEY)
      .map((key) => {
        const value = extractedData[key]?.trim();
        if (!value) {
          return null;
        }
        return `${key}: "${value}"`;
      }),
  ]
    .filter(Boolean)
    .join(" | ");

  const focalLine = activeField
    ? `Next exploration parameter to uncover (translate into human language — never say "${activeField.label}" as a form label): ${activeField.key}`
    : "Next exploration parameter: wrap-up — confirm the snapshot or invite corrections.";

  const freshAnchorLine =
    newlyCapturedKeys.length > 0
      ? `What they just gave you (acknowledge this with genuine interest before you pivot): ${userAnchors || "see latest user message"}`
      : "Fresh anchor: build from logged ingredients and their latest message.";

  return `ACKNOWLEDGE + INDUSTRY-TRANSLATE (reply mechanics)

${freshAnchorLine}
${focalLine}

Single-threaded shape for this reply:
1. One short beat of genuine acknowledgement tied to their exact words.
2. One natural conversational pivot — no checklist tone.
3. Exactly one open question targeting the next exploration parameter.

Industry translation (learn the mechanic — do not copy analogy nouns unless the user already used them):
The developer examples below are engine illustrations only. You must synthesize fresh domain vocabulary from the user's text, logged validation_goal, logged category weight, and conversation — never parrot kitchens, cloud databases, or other analogy words unless the user brought them up.

| Weight   | What the mechanic means (do not quote these rows verbatim) |
| physical | Frame time, budget, and validation milestones around material launch reality — space, inventory, equipment, opening doors — using their industry nouns. |
| digital  | Frame around build cycles, deployment, hosted tooling, proof milestones, focused build sessions — using their product nouns. |
| service  | Frame around client capacity, billable hours, delivery bandwidth, subcontract help — using their service nouns. |
| facilitation | Frame around liquidity to operate the matching engine, onboarding both sides, early traction spend — using their platform nouns. |

Current weight calibration: ${domainWeight}
If weight is unknown, infer from the user's words first; use background category key only as a tie-breaker.

When asking about validation_goal, available_time, or budget, blend your acknowledgement into their domain — make the question feel like it belongs to their venture, not a generic scoping form.`;
}

export function buildContextLockedInterrogationRules(
  extractedData: ExtractedData,
  activeField: ExtractionField | null,
  newlyCapturedKeys: string[],
  domainWeight: DomainWeight,
): string {
  const hasResourceLogged = Boolean(
    extractedData.available_time?.trim() || extractedData.budget?.trim(),
  );

  const hasScopeLogged = Boolean(
    extractedData.validation_goal?.trim() || extractedData[CATEGORY_FIELD_KEY]?.trim(),
  );

  return `${buildAcknowledgeAndIndustryTranslateBlock(
    extractedData,
    activeField,
    newlyCapturedKeys,
    domainWeight,
  )}

CONTEXT THREADING
- Every follow-up threads through logged ingredients — no generic intake script.
- Resource constraints logged: ${hasResourceLogged ? "yes" : "no"}. Scope or product context logged: ${hasScopeLogged ? "yes" : "no"}.
- When constraints and ambition pull in opposite directions, keep questions lean and grounded in what they already stated.
- Keep the reply punchy: two short paragraphs maximum, one question only.`;
}

export function buildResourceConflictDirective(
  conflict: ResourceConflictContext,
): string {
  if (!conflict.detected) {
    return "";
  }

  return `RESOURCE TENSION (weave naturally into your acknowledgement)
Internal tension note (do not quote mechanically): ${conflict.summary ?? "logged scope and logged resources may be misaligned"}
Offer two contrasting paths built only from their logged numbers and stated ambition — scope down to fit constraints, or expand resources to fit scope. Keep it conversational; no Option A/B labels.`;
}

export function buildPersonaDeliveryChecklist(): string {
  return `DELIVERY CHECKLIST
- Plain text only — no markdown bullets in the user-visible reply.
- Warm, direct, co-founder energy — interested, not interrogative.
- Never expose internal keys, taxonomy titles, field labels, or routing language.
- All specific nouns come from the user — synthesize domain language on the fly.
- One question. One thread. Done.`;
}
