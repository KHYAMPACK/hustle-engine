import type { DataPointDefinition } from "@/lib/ai/gauntlet/types";

export const SHARED_FOUNDATION_DATA_POINTS: readonly DataPointDefinition[] = [
  {
    key: "target_human",
    stage: 1,
    isFoundation: true,
    generationMode: "user_input",
    streetSmartLabel: "Who this is for",
    targetIntent:
      "Extract the razor-sharp target user archetype or niche audience profile to prevent a generalized 'for everyone' failure.",
    referenceBaseline:
      "Who is the specific person or business that will use this? Pinpoint exactly who they are.",
    analystCriteria:
      "A specific human or job title with a concrete context — not 'everyone', 'small businesses', or vague groups.",
    guardrailFocus:
      "Force one narrow starting customer. Use a restaurant analogy: one menu, one crowd, one location.",
  },
  {
    key: "core_friction",
    stage: 1,
    isFoundation: true,
    generationMode: "user_input",
    streetSmartLabel: "The main problem we're solving",
    targetIntent:
      "Isolate the single deepest pain point or acute problem forcing the target user to seek a solution.",
    referenceBaseline:
      "What is the single biggest annoyance or problem they have that makes them look for help?",
    analystCriteria:
      "A specific, recurring pain tied to the target human — measurable frustration, not a generic wish.",
    guardrailFocus:
      "Strip fluff. Name one operational leak that costs them time or money every week.",
  },
  {
    key: "core_utility",
    stage: 1,
    isFoundation: true,
    generationMode: "user_input",
    streetSmartLabel: "The immediate payoff",
    targetIntent:
      "Identify the absolute core outcome or immediate value hook they experience right away.",
    referenceBaseline:
      "What is the core outcome they get instantly from your offer?",
    analystCriteria:
      "A clear outcome the customer gets — the 'look good by summer' promise, not feature jargon.",
    guardrailFocus:
      "Translate features into one plain outcome the customer can picture immediately.",
  },
];

export const SHARED_STAGE_MASKS = [
  { stage: 1 as const, customerLanguage: "The core foundation" },
  { stage: 2 as const, customerLanguage: "Getting your first customers" },
  { stage: 3 as const, customerLanguage: "Resource boundaries" },
  { stage: 4 as const, customerLanguage: "How the business runs under the hood" },
  { stage: 5 as const, customerLanguage: "The math behind making a profit" },
];
