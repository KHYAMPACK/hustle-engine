import type { CategoryTrackConfig, DataPointDefinition } from "@/lib/ai/gauntlet/types";
import { getCustomerModelLanguage } from "@/lib/ai/gauntlet/taxonomy";

const DIGITAL_SOFTWARE_STAGE_MASKS = [
  { stage: 1 as const, customerLanguage: "The core foundation" },
  { stage: 2 as const, customerLanguage: "Getting your first customers" },
  { stage: 3 as const, customerLanguage: "Resource boundaries" },
  { stage: 4 as const, customerLanguage: "How the business runs under the hood" },
  { stage: 5 as const, customerLanguage: "The math behind making a profit" },
] as const;

const DIGITAL_SOFTWARE_DATA_POINTS: readonly DataPointDefinition[] = [
  {
    key: "target_human",
    stage: 1,
    isFoundation: true,
    generationMode: "user_input",
    streetSmartLabel: "Who this is for",
    targetIntent:
      "Extract the razor-sharp target user archetype or niche audience profile to prevent a generalized 'for everyone' failure.",
    referenceBaseline:
      "Who is the specific person or business that will use or play this? Try to pinpoint exactly who they are.",
    analystCriteria:
      "A specific human, job title, or niche audience — not 'everyone', 'small businesses', or vague groups.",
    guardrailFocus:
      "Force one narrow starting customer. Use a restaurant analogy: one menu, one crowd, one location.",
  },
  {
    key: "core_friction",
    stage: 1,
    isFoundation: true,
    generationMode: "ai_predict",
    streetSmartLabel: "The main problem we're solving",
    targetIntent:
      "Isolate the single deepest emotional or financial pain point, daily annoyance, or acute problem forcing them to look for a software solution.",
    referenceBaseline:
      "What is the single biggest annoyance, problem, or boredom itch they have that makes them look for a tool or game?",
    analystCriteria:
      "One specific recurring pain tied to the target user — emotional, financial, or daily annoyance — not a generic wish.",
    guardrailFocus:
      "Strip fluff. Name one operational leak that costs them time or money every week.",
  },
  {
    key: "core_utility",
    stage: 1,
    isFoundation: true,
    generationMode: "ai_predict",
    streetSmartLabel: "The immediate payoff",
    targetIntent:
      "Identify the absolute core outcome, core loop value, or immediate value realization hook they experience within the first 5 seconds.",
    referenceBaseline:
      "What is the absolute core outcome or addictive 5-second gameplay hook they get instantly from your product?",
    analystCriteria:
      "A concrete instant outcome or hook within the first interaction — not a feature list or long-term vision.",
    guardrailFocus:
      "Translate features into one plain outcome the customer can picture in five seconds.",
  },
  {
    key: "waitlist_slogan",
    stage: 2,
    isFoundation: false,
    generationMode: "ai_predict",
    streetSmartLabel: "The hook that stops the scroll",
    targetIntent:
      "Extract a clean, punchy landing page headline stripped of academic or confusing corporate jargon.",
    referenceBaseline:
      "Let's write a simple title sentence for your waitlist page. What is the biggest, punchiest benefit someone gets here?",
    analystCriteria:
      "A punchy, specific headline a real person would repeat — not generic marketing fluff or corporate jargon.",
    guardrailFocus:
      "Cut ad-speak. One sentence a tired founder would actually say out loud.",
  },
  {
    key: "verification_ask",
    stage: 2,
    isFoundation: false,
    generationMode: "ai_predict",
    streetSmartLabel: "The proof you need before building more",
    targetIntent:
      "Define the specific metric hurdle required to green-light the actual build phase (e.g., 20 waitlist emails, 5 client calls, or a pre-order cash deposit).",
    referenceBaseline:
      "How do we want people to prove they care? Should they drop an email on a waitlist, book a call, or put down a pre-order?",
    analystCriteria:
      "A concrete validation metric or action with a number or clear threshold — email count, calls, pre-orders, etc.",
    guardrailFocus:
      "Name one low-friction action with a measurable hurdle that costs them something — time, email, or money.",
  },
  {
    key: "fishing_hole",
    stage: 2,
    isFoundation: false,
    generationMode: "ai_predict",
    streetSmartLabel: "Where the first customers hang out",
    targetIntent:
      "Locate the precise online community (specific subreddit name, Facebook group, or niche forum) where this exact audience manually congregates.",
    referenceBaseline:
      "Where does this group of people hang out online? Name one specific subreddit, Facebook group, or online community.",
    analystCriteria:
      "Named specific community — subreddit, Facebook group, forum, Discord — not 'social media' or 'the internet'.",
    guardrailFocus:
      "Pick one pond — a named subreddit, group, or forum — not every platform at once.",
  },
  {
    key: "builder_lane",
    stage: 3,
    isFoundation: false,
    generationMode: "ai_predict",
    streetSmartLabel: "How we assemble the first version",
    allowedValues: ["Lego", "AI", "Custom"],
    targetIntent:
      "Map out their direct technical implementation capacity ceiling.",
    referenceBaseline:
      "Think of building your site like a house. Do you want to build with Lego Blocks (No-Code), AI Dictation, or Brick-by-Brick Custom Code?",
    analystCriteria:
      "Must resolve to exactly one of: Lego (no-code), AI (AI-assisted build), or Custom (hand-coded from scratch).",
    guardrailFocus:
      "Match the build style to their budget and hours — heavy custom on zero budget is a trap.",
  },
  {
    key: "core_scissors",
    stage: 3,
    isFoundation: false,
    generationMode: "ai_predict",
    streetSmartLabel: "What we cut out of version one",
    targetIntent:
      "Eliminate early scope creep completely by capturing secondary feature temptations and forcing them out of the MVP.",
    referenceBaseline:
      "Aside from the core feature we talked about, what extra features are you tempted to add that we can completely cross off for now?",
    analystCriteria:
      "Explicit named features or ambitions deferred from MVP — not vague 'keep it simple'.",
    guardrailFocus:
      "Name one tempting feature that would burn weeks for zero early revenue.",
  },
  {
    key: "resource_urgency",
    stage: 3,
    isFoundation: false,
    generationMode: "ai_predict",
    streetSmartLabel: "Your real time and money limits",
    targetIntent:
      "Quantify their hard asset boundaries (exact physical hours at the keyboard per week and maximum monthly subscription/tool budget in cash).",
    referenceBaseline:
      "How many hours can you realistically sit at your computer each week, and what is your monthly tool budget in cash?",
    analystCriteria:
      "Specific weekly hours AND a monthly cash budget for tools — both numbers or ranges required.",
    guardrailFocus:
      "Force honest numbers — vague 'a few hours' and 'as cheap as possible' burn runway.",
  },
  {
    key: "database_brain",
    stage: 4,
    isFoundation: false,
    generationMode: "ai_predict",
    streetSmartLabel: "What the app must remember forever",
    targetIntent:
      "Define the core information structures that the application's database engine must remember forever (e.g., user profiles, custom inputs, task logs).",
    referenceBaseline:
      "To build the database 'brain' of your app, what specific information does it need to remember forever (like user emails or scores)?",
    analystCriteria:
      "Named data entities or fields the system must persist — user emails, scores, logs, profiles, etc.",
    guardrailFocus:
      "List concrete data types — not 'everything' or 'user data' without specifics.",
  },
  {
    key: "interface_face",
    stage: 4,
    isFoundation: false,
    generationMode: "ai_predict",
    streetSmartLabel: "What the customer actually sees",
    targetIntent:
      "Extract the fundamental, minimal layout wireframe components (the literal buttons, data boxes, and inputs) displayed on their screen.",
    referenceBaseline:
      "When a user opens this specific feature on their screen, what do they physically see? Just list the visual buttons and boxes.",
    analystCriteria:
      "Specific UI elements — buttons, inputs, boxes, screens — not abstract 'dashboard' without components.",
    guardrailFocus:
      "One primary screen with named elements — not a full product tour.",
  },
  {
    key: "price_tag",
    stage: 5,
    isFoundation: false,
    generationMode: "ai_predict",
    streetSmartLabel: "How money leaves their pocket",
    targetIntent:
      "Establish the pricing mechanism architecture (e.g., flat single transaction, recurring monthly tier, or usage-based micro-charge).",
    referenceBaseline:
      "How much are you charging for this, and how do people pay? Is it a one-time charge or a flat monthly subscription?",
    analystCriteria:
      "Price amount or range PLUS mechanism — one-time, subscription, or usage — with concrete numbers.",
    guardrailFocus:
      "Attach a real dollar amount or range and why they'd happily pay it.",
  },
  {
    key: "home_base",
    stage: 5,
    isFoundation: false,
    generationMode: "ai_predict",
    streetSmartLabel: "Where you operate from",
    targetIntent:
      "Capture their operational country of residence to automatically map out payment processor gateways and regional tax parameters.",
    referenceBaseline:
      "What country do you physically live in right now?",
    analystCriteria:
      "A specific country of residence — not multiple regions or 'global'.",
    guardrailFocus:
      "One country where they physically operate — needed for payments and tax routing.",
  },
];

export const digitalSoftwareCategoryConfig: CategoryTrackConfig = {
  id: "1.1_digital_software",
  customerModelLanguage: getCustomerModelLanguage("1.1_digital_software"),
  triageAliases: [
    "saas_digital",
    "digital_product",
    "software",
    "digital_software",
  ],
  stages: DIGITAL_SOFTWARE_STAGE_MASKS,
  dataPoints: DIGITAL_SOFTWARE_DATA_POINTS,
};

/** All evaluation keys for Category 1.1 — used when initializing extractedData JSONB. */
export const DIGITAL_SOFTWARE_EVALUATION_KEYS = DIGITAL_SOFTWARE_DATA_POINTS.map(
  (point) => point.key,
);
