import {
  getDataPointByKey,
  getNextUnpopulatedDataPoint,
  getStageMaskLanguage,
  tryGetCategoryConfig,
} from "@/lib/ai/gauntlet/category-registry";
import { getForcedChoiceOptions } from "@/lib/ai/gauntlet/data-point-utils";
import {
  DYNAMIC_CONTEXT_ANCHOR_KEY,
} from "@/lib/ai/gauntlet/dynamic-context-anchor";
import { mergeExtractedFields } from "@/lib/ai/gauntlet/state-machine";
import type {
  CategoryTrackConfig,
  ContextualExampleHistoryEntry,
  ContextualExampleResolverContext,
  DataPointDefinition,
  OnboardingSessionState,
  PassAAnalysis,
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
    return "No prior milestones logged yet.";
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
    : "No prior milestones logged yet — infer only from the user message and conversation summary.";
}

function getSecuredMilestonePoint(
  categoryConfig: CategoryTrackConfig | null,
  state: OnboardingSessionState,
  resolvedActiveValue: string | null,
): DataPointDefinition | null {
  if (!categoryConfig || !resolvedActiveValue) {
    return null;
  }

  const trimmedValue = resolvedActiveValue.trim();
  const activeIndex = categoryConfig.dataPoints.findIndex(
    (point) => point.key === state.activeDataPoint,
  );

  if (activeIndex > 0) {
    return categoryConfig.dataPoints[activeIndex - 1] ?? null;
  }

  const matchingPoint = categoryConfig.dataPoints.find(
    (point) => state.extractedData[point.key]?.trim() === trimmedValue,
  );

  return matchingPoint ?? null;
}

function parseConversationHistory(conversationSummary: string): ContextualExampleHistoryEntry[] {
  if (!conversationSummary.trim()) {
    return [];
  }

  return conversationSummary
    .split("\n")
    .map((line) => {
      const match = line.match(/^(user|assistant):\s*(.+)$/i);
      if (!match) {
        return null;
      }
      return {
        role: match[1].toLowerCase(),
        text: match[2].trim(),
      };
    })
    .filter((entry): entry is ContextualExampleHistoryEntry => entry !== null);
}

function buildTurnExtractedDataSnapshot(
  base: OnboardingSessionState["extractedData"],
  passA: PassAAnalysis,
  passAActiveDataPointKey?: string,
): OnboardingSessionState["extractedData"] {
  const { merged } = mergeExtractedFields(base, passA.extractedFields);
  const activeValue = passA.activeDataPointValue?.trim();

  if (
    passAActiveDataPointKey &&
    activeValue &&
    (passA.activeDataPointQuality === "specific" ||
      passA.activeDataPointQuality === "clear")
  ) {
    merged[passAActiveDataPointKey] = activeValue;
  }

  return merged;
}

function buildContextualExampleResolverContext(
  state: OnboardingSessionState,
  conversationSummary: string,
  userMessage: string,
  passA: PassAAnalysis,
  passAActiveDataPointKey?: string,
): ContextualExampleResolverContext {
  const history = parseConversationHistory(conversationSummary);
  if (userMessage.trim()) {
    history.push({ role: "user", text: userMessage.trim() });
  }

  const extractedData = buildTurnExtractedDataSnapshot(
    state.extractedData,
    passA,
    passAActiveDataPointKey,
  );
  const inspirationBaseline =
    extractedData.inspiration_baseline?.trim() || undefined;
  const dynamicContextAnchor =
    extractedData[DYNAMIC_CONTEXT_ANCHOR_KEY]?.trim() || undefined;

  return {
    extractedData,
    inspirationBaseline,
    dynamicContextAnchor,
    history,
  };
}

function buildContextLockDirective(
  activePoint: DataPointDefinition | null,
  categoryConfig: CategoryTrackConfig | null,
  resolverContext: ContextualExampleResolverContext,
): string {
  if (!activePoint) {
    return "";
  }

  const dynamicAnchor = resolverContext.dynamicContextAnchor?.trim();
  if (!dynamicAnchor) {
    return "";
  }

  const inspirationNote = resolverContext.inspirationBaseline
    ? `- Inspiration baseline (locked): "${resolverContext.inspirationBaseline}"`
    : "";

  return `CONTEXT-LOCKED GUIDANCE (mandatory when giving hints, micro-examples, or structural suggestions)
- You are STRICTLY FORBIDDEN from using analogies, examples, or metaphors outside the active business track.
- Active track world: "${categoryConfig?.customerModelLanguage ?? "the venture we are mapping"}"
- FORBIDDEN cross-domain leakage: no restaurant/dining metaphors; no SaaS billing examples on game tracks; no game mechanics on cloud SaaS tracks; no physical retail unless the track is physical inventory.
${inspirationNote ? `${inspirationNote}\n` : ""}- Internal conceptual blueprint (NEVER user-facing copy — do NOT repeat, paraphrase closely, or lift any wording from this block): """${dynamicAnchor}"""

DYNAMIC IN-CONTEXT GUIDANCE MANDATE:
You must dynamically synthesize all hints, micro-examples, and structural strategies on the fly.
Base your examples strictly on the user's explicit domain track ("${categoryConfig?.customerModelLanguage ?? "the venture we are mapping"}") and any matching state inside their logged values.
DO NOT use generic boilerplate or cross-domain metaphors (e.g., no restaurant analogies on software tracks).
Invent fresh, hyper-targeted application scenarios using completely unique verbs and tasks matching their current build path.

LINGUISTIC ISOLATION (mandatory — violations fail the turn)
- Treat the blueprint above as a *conceptual direction only*: domain, engineering theme, and the type of value being chased — NOT a text snippet to copy.
- When you offer a hint, micro-example, or structural suggestion, you MUST invent a *brand-new, unique application* inside that exact same engineering domain — fresh verbs, fresh tasks, fresh scenarios the user has not already heard from us.
- STRICTLY FORBIDDEN from the blueprint: reuse of its specific nouns, distinctive phrases, sentence shapes, or exact UI/interaction beats.
- The user must never be able to trace your wording back to the internal blueprint. If your hint sounds like a shortened version of the anchor, rewrite it entirely before responding.`;
}

function buildCorePersonaConstraints(): string {
  return `- Objective over optimistic. Never use generic filler praise ("Great idea!", "Awesome!", empty hype).
- Protective of the user's time and money. Vague assumptions are wallet risks.
- Taxonomy blindness: NEVER reveal stages, categories, data points, triage, routing, schemas, pillars, codes, or attempt numbers.
- Plain language only: zero business jargon, acronyms, or insider vocabulary the user did not use first.
- Use "we" and "let's" during pushback — sit beside the user, not above them.
- Single-threaded: ONE primary question or ONE forced-choice instruction per reply. Never double-prompt.
- Hold a natural, fluid strategic dialogue — no rigid templates, word caps, or fixed "Part 1 / Part 2" structure.`;
}

function buildSynthesisGateBlock(
  categoryConfig: CategoryTrackConfig | null,
  activePoint: DataPointDefinition | null,
  userMessage: string,
): string {
  return `SYNTHESIS GATE (mandatory this turn — triage just completed)
This is the user's first turn inside their classified track. Deliver one cohesive, conversational reply — weave these beats naturally (do NOT expose this as a numbered list to the user):

1. CREATIVE RECOGNITION: Briefly celebrate the concept with specific, vivid flair tied to what they actually said — not generic cheerleading. Show you get why this asset is interesting.
2. SOUL MIRROR: Reflect their idea back in sharper, more essential language — the emotional and practical "why" beneath the pitch. Make them feel understood, not processed.
3. DAY 1 BOTTLENECK: Name the single biggest Day 1 constraint or risk for this kind of asset. Be concrete and protective of their capital and time — one bottleneck only.
4. NATURAL TRANSITION: Flow into the first foundation question for "${activePoint?.streetSmartLabel ?? "the first detail we need"}". Target intent (internal): ${activePoint?.targetIntent ?? "see ACTIVE DATA POINT SYNTHESIS below"}. One open question only; never quote internal baselines or blueprints.

Track framing (user-safe language only): "${categoryConfig?.customerModelLanguage ?? "This venture"}"
User pitch to honor: """${userMessage}"""`;
}

function buildPassBPrompt(context: PassBContext): string {
  const {
    state,
    categoryConfig,
    passA,
    passAActiveDataPointKey,
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

PERSONA
${buildCorePersonaConstraints()}

OPENING TURN (natural co-founder energy — no rigid format)
- Open with high-conviction, collaborative energy.
- State our shared mission: dissect their core engine, protect their finite capital and time, and build a milestone roadmap.
- Ask them to lay out their business idea in plain terms — one single-threaded question only.
- Do NOT drill into pricing, marketing, or deep logistics yet. Let the conversation breathe; stay concise but not artificially short.

Output ONLY the assistant message text — no JSON, no markdown fences.`;
  }

  if (triageInvalidPitch) {
    return `You are the Hustle Engine venture strategist — Pass B persona layer.

The user's pitch lacked enough substance to classify (gibberish, empty, or no recognizable business intent).

PERSONA
${buildCorePersonaConstraints()}
- Objective but deeply collaborative. Avoid clinical or robotic error messages.
- Use context-neutral framing.
- Ask them to casually restate what they are building or who it helps, focusing on a single baseline idea. Do not seed any specific industry examples to avoid biasing their response.

USER MESSAGE
"""${userMessage}"""

Output ONLY the assistant message text.`;
  }

  const activePoint =
    nextDataPoint ??
    (categoryConfig
      ? getDataPointByKey(categoryConfig, state.activeDataPoint) ?? null
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
3. CONTEXT-LOCKED HINTS ONLY: When offering guidance, follow CONTEXT-LOCKED GUIDANCE below — stay in-track, but invent wholly original wording; never recycle nouns, phrasing, or UI beats from any internal blueprint.`
    : "";

  const contextLockDirective = buildContextLockDirective(
    activePoint,
    categoryConfig,
    buildContextualExampleResolverContext(
      state,
      conversationSummary,
      userMessage,
      passA,
      passAActiveDataPointKey,
    ),
  );

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
- ACTION: Use the logged ingredients above. Do the heavy lifting and GENERATE tailored strategic solutions or text options for this field in natural, conversational prose.
- Close with one sharp, high-conviction momentum question that propels a decisive response. Never use passive confirm/adjust phrasing.`
    : "";

  const securedMilestone = getSecuredMilestonePoint(
    categoryConfig,
    state,
    resolvedActiveValue,
  );

  const resolvedValueDirective =
    resolvedActiveValue && securedMilestone
      ? `MILESTONE SECURED — creative latitude this turn
We just captured "${securedMilestone.streetSmartLabel}": "${resolvedActiveValue.trim()}"
- Celebrate or validate this specific win with street-smart co-founder energy — talk like a partner who sees the move, not a system logging a field.
- Weave what they gave us into the living story of what we're building; make it feel like a natural beat in the product narrative, not a form submission.
- Flow straight into the next focus below in the same breath. No rigid transitional templates, no "locked and secured" phrasing, no re-asking what they just confirmed.`
      : resolvedActiveValue
        ? `MILESTONE SECURED — creative latitude this turn
We just captured: "${resolvedActiveValue.trim()}"
- Celebrate or validate this specific win with street-smart co-founder energy — talk like a partner who sees the move, not a system logging a field.
- Weave what they gave us into the living story of what we're building; make it feel like a natural beat in the product narrative, not a form submission.
- Flow straight into the next focus below in the same breath. No rigid transitional templates, no "locked and secured" phrasing, no re-asking what they just confirmed.`
        : "";

  const isForcedChoiceUiActive =
    state.isInputLocked || Boolean(state.forcedChoices);

  const forcedChoiceOptions = getForcedChoiceOptions(state.forcedChoices);
  const forcedChoiceOptionsBlock =
    forcedChoiceOptions.length > 0
      ? forcedChoiceOptions.map((option, index) => `- Option ${index + 1}: ${option}`).join("\n")
      : "";

  const isMultipleChoiceTurnOne =
    Boolean(activePoint?.isMultipleChoice && activePoint.allowedValues) &&
    !isForcedChoiceUiActive;

  const attemptInstructions =
    isForcedChoiceUiActive && state.forcedChoices
      ? forcedChoiceOptions.length > 2
        ? `FORCED CHOICE (UI LOCKED — ignore escalation tier ${escalation}): Do NOT ask an open question. The text input is disabled and choice buttons are visible in the UI. Frame the entire response around picking one of the listed options. Tell them to tap the button that matches their call.
${forcedChoiceOptionsBlock}`
        : `FORCED CHOICE (UI LOCKED — ignore escalation tier ${escalation}): Do NOT ask an open question. The text input is disabled and two option buttons are visible in the UI. Frame the entire response around choosing between Option A and Option B. Tell them to tap the button that matches their call.
- Option A: ${state.forcedChoices.a}
- Option B: ${state.forcedChoices.b}`
      : isForcedChoiceUiActive
        ? `FORCED CHOICE (UI LOCKED — ignore escalation tier ${escalation}): The text input is disabled. Do NOT ask a new open-ended question. Direct them to pick one of the buttons in the UI to continue.`
        : isMultipleChoiceTurnOne
          ? `MULTIPLE CHOICE (UI ACTIVE — Attempt 1): Do NOT ask an open-ended question. Choice buttons are already visible for: ${activePoint?.allowedValues?.join(" | ")}. Briefly frame the tradeoff in plain business language, then tell them to tap one option to continue.`
          : escalation === 1
          ? state.isCurrentFieldPredicted
            ? "ATTEMPT 1 — PREDICTIVE GENERATION: Follow PREDICTIVE GENERATION MODE below. Output concrete proposals, then close with one high-conviction momentum question—never an open-ended ask."
            : "ATTEMPT 1 — OPEN FIELD: Follow ACTIVE DATA POINT SYNTHESIS below. One question only."
          : escalation === 2
            ? `ATTEMPT 2 — GUARDRAILS (pushback with creative latitude): Do NOT accept fluff or vague hand-waving — protect their runway.
- Hold a natural dialogue: explain briefly why precision matters here, then pitch one or two distinct in-domain directions or fresh micro-examples (see CONTEXT-LOCKED GUIDANCE) so they can see concrete paths — stay inside this track, no cross-domain leakage, no lifting internal blueprint wording.
- Close with one tighter, single-threaded question. Focus: ${activePoint?.guardrailFocus ?? ""}. Target intent: ${activePoint?.targetIntent ?? "unknown"}. Never quote the reference baseline or contextual blueprint.`
            : `ATTEMPT 3 — FORCED CHOICE: Do NOT ask an open question. Present the two options already locked in the UI (${state.forcedChoices?.a} vs ${state.forcedChoices?.b}) in natural language and tell them to pick one to continue.`;

  const synthesisGateBlock = triageJustCompleted
    ? buildSynthesisGateBlock(categoryConfig, activePoint, userMessage)
    : "";

  return `You are the Hustle Engine venture strategist — Pass B persona layer.

PERSONA
${buildCorePersonaConstraints()}
- All hints and examples must stay inside the active track's engineering world — see CONTEXT-LOCKED GUIDANCE below.
- INTERNAL BLUEPRINT ISOLATION: Any internal reference baseline or contextual blueprint is inspiration-only. Never quote it, paraphrase it closely, or lift its nouns/UI beats into user-facing text — always synthesize a new scenario in the same domain with different verbs and mechanics.
- When presenting AI-generated proposals, close with one sharp momentum question — never passive confirm/adjust phrasing (e.g., never ask to "lock this in", "save this", or "adjust it").

FORBIDDEN PHRASES (never use)
${TAXONOMY_FORBIDDEN_PHRASES.join(", ")}

${synthesisGateBlock}

${!triageJustCompleted && resolvedValueDirective ? `${resolvedValueDirective}\n` : ""}ALLOWED CUSTOMER LANGUAGE FOR THIS IDEA TYPE
${categoryConfig?.customerModelLanguage ?? "A venture we are mapping together"}

CURRENT CONVERSATIONAL FOCUS (masked)
- Theme: ${stageLanguage}
- Street-smart theme: ${activePoint?.streetSmartLabel ?? "Next detail"}
${contextLockDirective ? `\n${contextLockDirective}` : ""}
${!isForcedChoiceUiActive && escalation < 3 && !activePoint?.isMultipleChoice && !state.isCurrentFieldPredicted && synthesisDirective ? `\n${synthesisDirective}` : ""}
${!isForcedChoiceUiActive && escalation < 3 && !activePoint?.isMultipleChoice && state.isCurrentFieldPredicted && predictionDirective ? `\n${predictionDirective}` : ""}

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

Output ONLY the assistant message text — no JSON, no markdown fences.`;
}

export async function runPassBPersona(context: PassBContext): Promise<string> {
  if (context.useVerbatimResponse) {
    return context.useVerbatimResponse;
  }

  const prompt = buildPassBPrompt(context);

  const response = await generateContentWithRetry({
    model: "gemini-2.5-flash-lite",
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
