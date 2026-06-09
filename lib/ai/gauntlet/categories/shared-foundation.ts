import type { DataPointDefinitionInput } from "@/lib/ai/gauntlet/data-point-utils";

export const SHARED_FOUNDATION_DATA_POINTS: readonly DataPointDefinitionInput[] = [
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
      "Force one narrow starting customer segment — not a broad market.",
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
      "Name one recurring workflow leak that costs them time or money every week.",
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
      "A clear outcome the customer gets — a concrete win, not feature jargon.",
    guardrailFocus:
      "State one outcome the customer can picture on first use — not a roadmap pitch.",
  },
];

export const SHARED_STAGE_MASKS = [
  { stage: 1 as const, customerLanguage: "The core foundation" },
  { stage: 2 as const, customerLanguage: "Getting your first customers" },
  { stage: 3 as const, customerLanguage: "Resource boundaries" },
  { stage: 4 as const, customerLanguage: "How the business runs under the hood" },
  { stage: 5 as const, customerLanguage: "The math behind making a profit" },
];
