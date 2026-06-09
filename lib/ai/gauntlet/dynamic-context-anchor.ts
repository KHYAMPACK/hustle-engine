import { getSection1Snapshot } from "@/lib/ai/gauntlet/data-point-utils";
import type {
  CategoryTrackConfig,
  ExtractedData,
  OnboardingSessionState,
} from "@/lib/ai/gauntlet/types";
import { generateContentWithRetry } from "@/lib/ai/gemini-client";

export const DYNAMIC_CONTEXT_ANCHOR_KEY = "dynamic_context_anchor";
export const INSPIRATION_BASELINE_KEY = "inspiration_baseline";

export function hasDynamicContextAnchor(extractedData: ExtractedData): boolean {
  return Boolean(extractedData[DYNAMIC_CONTEXT_ANCHOR_KEY]?.trim());
}

export function hasInspirationBaseline(extractedData: ExtractedData): boolean {
  return Boolean(extractedData[INSPIRATION_BASELINE_KEY]?.trim());
}

export function needsDynamicContextAnchorGeneration(
  extractedData: ExtractedData,
): boolean {
  return hasInspirationBaseline(extractedData) && !hasDynamicContextAnchor(extractedData);
}

function formatLoggedValuesBlock(
  config: CategoryTrackConfig,
  extractedData: ExtractedData,
): string {
  const snapshot = getSection1Snapshot(config, extractedData);
  const lines = Object.entries(snapshot).map(
    ([key, value]) => `- ${key}: "${value}"`,
  );

  return lines.length > 0
    ? lines.join("\n")
    : "- No additional Section 1 values locked yet.";
}

function buildDomainBlueprintPrompt(
  config: CategoryTrackConfig,
  extractedData: ExtractedData,
  conversationSummary: string,
): string {
  const inspiration = extractedData[INSPIRATION_BASELINE_KEY]?.trim() ?? "";
  const loggedValues = formatLoggedValuesBlock(config, extractedData);

  return `You are an internal domain analyst for a venture onboarding engine. Your output is NEVER shown to the user — it seeds hint generation for a co-founder strategist.

DOMAIN TRACK (user-safe framing): "${config.customerModelLanguage}"

CORE VISION / INSPIRATION BASELINE:
"""${inspiration}"""

LOGGED SECTION 1 VALUES (if any):
${loggedValues}

RECENT CONVERSATION (context only):
${conversationSummary || "No prior turns."}

TASK
Produce a 3-bullet "Domain Blueprint" for this exact project variant. Output ONLY the three bullets — no preamble, no markdown headers.

Each bullet MUST cover exactly one of these themes (in order):
1. ENGINEERING LOOP STYLE — the specific interaction or value loop style for this exact project variant (how work/play/value cycles in their domain).
2. HIGH-VULNERABILITY HURDLE — the single highest-risk engineering or execution trap most likely to burn their time or capital on Day 1 for this domain.
3. CONCEPTUAL EXAMPLE — one fresh, track-safe micro-scenario matching their visual dimension, target platform, and engine world when known from logged values; otherwise infer conservatively from the inspiration baseline.

RULES
- Stay strictly inside the domain track above — zero cross-domain metaphors.
- Hyper-specific to their stated vision — no generic SaaS or game boilerplate.
- Use concrete engineering language; each bullet is 1-2 sentences max.
- Do not mention internal taxonomy, category codes, pillars, or data point keys.`;
}

export async function generateDynamicContextAnchor(
  config: CategoryTrackConfig,
  extractedData: ExtractedData,
  conversationSummary: string,
): Promise<string> {
  const prompt = buildDomainBlueprintPrompt(config, extractedData, conversationSummary);

  const response = await generateContentWithRetry({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      temperature: 0,
    },
  });

  return response.text?.trim() ?? "";
}

export async function ensureDynamicContextAnchor(
  state: OnboardingSessionState,
  config: CategoryTrackConfig,
  conversationSummary: string,
): Promise<OnboardingSessionState> {
  if (!needsDynamicContextAnchorGeneration(state.extractedData)) {
    return state;
  }

  const blueprint = await generateDynamicContextAnchor(
    config,
    state.extractedData,
    conversationSummary,
  );

  if (!blueprint) {
    return state;
  }

  return {
    ...state,
    extractedData: {
      ...state.extractedData,
      [DYNAMIC_CONTEXT_ANCHOR_KEY]: blueprint,
    },
  };
}
