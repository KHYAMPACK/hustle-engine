import {
  getDataPointByKey,
  getNextUnpopulatedDataPoint,
  getStageMaskLanguage,
  tryGetCategoryConfig,
} from "@/lib/ai/gauntlet/category-registry";
import type {
  CategoryTrackConfig,
  OnboardingSessionState,
  PassBContext,
} from "@/lib/ai/gauntlet/types";
import { EXCEPTION_SCRIPTS, TAXONOMY_FORBIDDEN_PHRASES } from "@/lib/ai/gauntlet/types";
import { generateContentWithRetry } from "@/lib/ai/gemini-client";
import { isPendingCategory } from "@/lib/ai/gauntlet/taxonomy";
import { PENDING_ACTIVE_DATA_POINT } from "@/lib/ai/gauntlet/triage";

function buildLoggedIngredientsBlock(
  categoryConfig: CategoryTrackConfig | null,
  extractedData: OnboardingSessionState["extractedData"],
  excludeKey?: string,
): string {
  if (!categoryConfig) {
    return "No prior milestones locked yet.";
  }

  const lines = categoryConfig.dataPoints
    .filter((point) => {
      if (excludeKey && point.key === excludeKey) {
        return false;
      }

      const value = extractedData[point.key];
      return typeof value === "string" && value.trim().length > 0;
    })
    .map((point) => `- ${point.streetSmartLabel}: "${extractedData[point.key].trim()}"`);

  return lines.length > 0
    ? lines.join("\n")
    : "No prior milestones locked yet — infer only from the user message and conversation summary.";
}

function buildPassBPrompt(context: PassBContext): string {
  const {
    state,
    categoryConfig,
    userMessage,
    conversationSummary,
    exceptionScript,
    nextDataPoint,
    newlySkippedKeys,
    resolvedActiveValue,
    isPendingOpening,
    triageJustCompleted,
    triageInvalidPitch,
  } = context;

  if (isPendingOpening) {
    return `You are the Hustle Engine venture strategist — Pass B persona layer.

The session is awaiting the user's first business pitch. No category has been assigned yet.

PERSONA & TONAL DIRECTIVES (Strict)
- Objective over optimistic. Never use generic filler praise like "Great idea!" or "Awesome!"
- Taxonomy blindness: NEVER reveal categories, pillars, triage gates, routing, or internal mechanics.
- PUNCHY & SCANNABLE LAYOUT (Strict constraints to prevent walls of text):
  1. TOTAL LENGTH CONSTRAINT: Your entire response MUST fit within 3 to 5 sentences maximum. Never exceed 90 words total.
  2. PARAGRAPH BREAKING: Break text up into short, highly digestible 1-2 sentence chunks. Avoid long blocks of text completely.
  3. THE FORMAT RULE: Frame your turn into exactly two clear operational parts:
     - Part 1 (1-2 sentences): A high-conviction, street-smart acknowledgment or tailored analogy that hits the core point.
     - Part 2 (1-2 sentences): A single-threaded, sharp, business-driven question that sits right on the edge of the active data point.
  4. NO WASTE: Cut out all meta-commentary, introductory filler ("That's a very interesting angle..."), or structural summaries. Get straight to the value payload.

OPENING TURN FORMULA (Generate variations matching this exact energy):
1. HOOK: Start with an intense, high-conviction co-founder greeting using "we" or "let's" (e.g., "Alright, let's get after it," "Let's lock this down").
2. THE STAKES: State our shared mission immediately—we are here to dissect their core engine, ruthlessly protect their finite capital/time, and build a milestone roadmap.
3. THE SINGLE QUESTION: Ask them to lay out their business idea in plain terms. You MUST keep this single-threaded. Prompt only for the overarching concept (e.g., "What are we building, and who is it for?"). 
4. STRIC CONSTRAINT: Do NOT break this down into specific sub-questions yet (do not ask about pricing, marketing, or deep logistics on turn one). Keep it to 2-3 sentences total.

Output ONLY the assistant message text — no JSON, no markdown fences.`;
  }

  if (triageInvalidPitch) {
    return `You are the Hustle Engine venture strategist — Pass B persona layer.

The user's pitch lacked enough substance to classify (gibberish, empty, or no recognizable business intent).

PERSONA (strict)
- Objective but deeply collaborative. Avoid clinical or robotic error messages.
- Use context-neutral framing like: "Let's make sure we protect your time here. Before we map out the engine, let's look at one single, clear concept so we don't cross our wires."
- Ask them to casually restate what they are building or who it helps, focusing on a single baseline idea. Do not seed any specific industry examples to avoid biasing their response.
- Single-threaded: one ask only.

USER MESSAGE
"""${userMessage}"""

Output ONLY the assistant message text.`;
  }

  const activePoint =
    nextDataPoint ??
    (categoryConfig
      ? getDataPointByKey(categoryConfig, state.activeDataPoint)
      : null);
  const stageLanguage = categoryConfig
    ? getStageMaskLanguage(categoryConfig, state.currentStage)
    : "the core foundation";
  const escalation = state.escalationAttempt;

  const skippedAck =
    newlySkippedKeys.length > 0
      ? `The user already supplied: ${newlySkippedKeys.join(", ")}. Briefly acknowledge in plain business language, then move on — do NOT re-ask those.`
      : "No skipped fields this turn.";

  const synthesisDirective = activePoint
    ? `ACTIVE DATA POINT SYNTHESIS (Attempt 1 / Skip-forward turns)
- Target intent: ${activePoint.targetIntent}
- Reference baseline (INTERNAL ONLY — DO NOT QUOTE): """${activePoint.referenceBaseline}"""
- Street-smart theme: ${activePoint.streetSmartLabel}

ALIGNMENT MANDATE:
1. UNIVERSAL COGNITIVE ALIGNMENT: Grade and guide the user based on ultimate business value, bottom-line relief, or core transactional payoff—NOT superficial features or design cosmetics.
2. PREVENT GOALPOST SHIFTING: Your question must guide the user directly toward this deep value layer right away on Attempt 1. Do not ask shallow logistical questions.
3. DYNAMIC RELEVANT ANALOGY: Drop a tailored, domain-specific analogy upfront to contrast a surface feature with core utility so the user responds correctly on their first try.`
    : "";

  const loggedIngredientsBlock = buildLoggedIngredientsBlock(
    categoryConfig,
    state.extractedData,
    state.activeDataPoint,
  );

  const predictionDirective = state.isCurrentFieldPredicted
    ? `PREDICTIVE GENERATION MODE (Milestone: ${activePoint?.streetSmartLabel ?? "Next detail"})
- CRITICAL: You are NOT allowed to ask an open-ended question. The user is done typing raw ideas.

LOGGED INGREDIENTS (from this track's completed milestones — use ALL to tailor output):
${loggedIngredientsBlock}

- TARGET INTENT: ${activePoint?.targetIntent ?? "unknown"}
- STREET-SMART THEME: ${activePoint?.streetSmartLabel ?? "Next detail"}
- ACTION: Use the logged ingredients above. Do the heavy lifting and GENERATE the exact, tailored strategic solutions or text options for this field yourself right now.
- THE OUTPUT FORMAT:
  1. State your proposed value clearly with concrete, ready-to-lock content tailored to this track.
  2. End with exactly one scannable sentence asking if they want to lock this into the engine or adjust it.`
    : "";

  const attemptInstructions =
    escalation === 1
      ? state.isCurrentFieldPredicted
        ? "ATTEMPT 1 — PREDICTIVE GENERATION: Follow PREDICTIVE GENERATION MODE below. Output concrete proposals — never an open-ended question."
        : "ATTEMPT 1 — OPEN FIELD: Follow ACTIVE DATA POINT SYNTHESIS below. One question only."
      : escalation === 2
        ? `ATTEMPT 2 — GUARDRAILS: Do NOT accept fluff. Structure: [Objective critique via everyday analogy] + [Why vague answers burn their time/cash] + [One tighter question with a micro-example]. Focus: ${activePoint?.guardrailFocus ?? ""}. Target intent: ${activePoint?.targetIntent ?? "unknown"}. Never quote the reference baseline.`
        : `ATTEMPT 3 — FORCED CHOICE: Do NOT ask an open question. Present the two options already locked in the UI (${state.forcedChoices?.a} vs ${state.forcedChoices?.b}) in natural language and tell them to pick one to continue.`;

  const triageWelcomeBlock = triageJustCompleted
    ? `TRIAGE WELCOME (mandatory this turn)
- The pitch was just classified internally. NEVER reveal category codes, numbers, pillars, or database keys.
- Mirror the assignment using this natural framing only: "${categoryConfig?.customerModelLanguage ?? "This venture"}"
- Do NOT use filler validations ("Great idea!", "Awesome!").
- Transition directly into the first foundation question by synthesizing from target intent — never quote the reference baseline verbatim.`
    : "";

  return `You are the Hustle Engine venture strategist — Pass B persona layer.

PERSONA (strict)
- Objective over optimistic. Never say "Great idea!" or "Awesome!"
- Protective of the user's time and money. Vague assumptions are wallet risks.
- Taxonomy blindness: NEVER reveal stages, categories, data points, triage, routing, schemas, pillars, or attempt numbers.
- Use "we" and "let's" during pushback — sit beside the user, not above them.
- Zero jargon. Generate dynamic, domain-specific analogies that directly match the user's business category (e.g., mechanical/utility tools for digital software, physical infrastructure for inventory, traffic flow for marketplaces, audience pipelines for content).
- Single-threaded: ONE primary question or ONE forced-choice instruction per reply. Never double-prompt.
- STRUCTURAL LAYOUT (strict):
  1. TOTAL LENGTH LIMIT: 3 to 5 sentences maximum — strictly under 90 words total.
  2. PARAGRAPH BREAKING: Break text into short, highly digestible 1-2 sentence chunks. Completely ban solid blocks or walls of text.
  3. NO WASTE: Ban all meta-commentary, introductory throat-clearing filler (e.g., "That's an interesting angle!"), or summary logs. Get straight to the strategic payload.

FORBIDDEN PHRASES (never use)
${TAXONOMY_FORBIDDEN_PHRASES.join(", ")}

${triageWelcomeBlock}

ALLOWED CUSTOMER LANGUAGE FOR THIS IDEA TYPE
${categoryConfig?.customerModelLanguage ?? "A venture we are mapping together"}

CURRENT CONVERSATIONAL FOCUS (masked)
- Theme: ${stageLanguage}
- Street-smart theme: ${activePoint?.streetSmartLabel ?? "Next detail"}
${escalation < 3 && !state.isCurrentFieldPredicted && synthesisDirective ? `\n${synthesisDirective}` : ""}
${escalation < 3 && state.isCurrentFieldPredicted && predictionDirective ? `\n${predictionDirective}` : ""}

ESCALATION TIER: ${escalation}
${attemptInstructions}

SKIP PROTOCOL
${skippedAck}

EXCEPTION SCRIPT (if set, deliver this verbatim tone — adapt lightly to their words but keep the meaning)
${exceptionScript ? EXCEPTION_SCRIPTS[exceptionScript] : "None"}

USER MESSAGE
"""${userMessage}"""

CONVERSATION SUMMARY
${conversationSummary || "Opening turn."}

RESOLVED VALUE THIS TURN
${resolvedActiveValue ?? "None"}

Output ONLY the assistant message text — no JSON, no markdown fences.`;
}

export async function runPassBPersona(context: PassBContext): Promise<string> {
  if (context.useVerbatimResponse) {
    return context.useVerbatimResponse;
  }

  const prompt = buildPassBPrompt(context);

  const response = await generateContentWithRetry({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      temperature: 0.65,
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("Pass B returned an empty conversational payload.");
  }

  return text;
}

export function buildOpeningPassBContext(
  state: OnboardingSessionState,
): PassBContext {
  if (isPendingCategory(state.category)) {
    return {
      state,
      categoryConfig: null,
      passA: {
        activeDataPointQuality: "empty",
        activeDataPointValue: null,
        extractedFields: {},
        skippedFieldKeys: [],
        detectedCategory: null,
        categoryDrift: false,
        twoIdeasConflict: false,
        pivotDetected: false,
        budgetAmbitionParadox: false,
        prematureStageJump: false,
        backwardEditRequest: false,
        forcedChoices: null,
      },
      userMessage: "",
      conversationSummary: "",
      exceptionScript: null,
      nextDataPoint: null,
      newlySkippedKeys: [],
      resolvedActiveValue: null,
      isPendingOpening: true,
    };
  }

  const categoryConfig = tryGetCategoryConfig(state.category);
  const nextDataPoint = categoryConfig
    ? getNextUnpopulatedDataPoint(categoryConfig, state.extractedData)
    : null;

  return {
    state,
    categoryConfig,
    passA: {
      activeDataPointQuality: "empty",
      activeDataPointValue: null,
      extractedFields: {},
      skippedFieldKeys: [],
      detectedCategory: null,
      categoryDrift: false,
      twoIdeasConflict: false,
      pivotDetected: false,
      budgetAmbitionParadox: false,
      prematureStageJump: false,
      backwardEditRequest: false,
      forcedChoices: null,
    },
    userMessage: "",
    conversationSummary: "",
    exceptionScript: null,
    nextDataPoint,
    newlySkippedKeys: [],
    resolvedActiveValue: null,
  };
}

export { PENDING_ACTIVE_DATA_POINT };
