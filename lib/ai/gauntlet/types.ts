export type EscalationAttempt = 1 | 2 | 3;

export type GauntletStage = 1 | 2 | 3 | 4 | 5;

export type BusinessCategoryId =
  | "1.1A_static_assets"
  | "1.1B_ecosystem_extensions"
  | "1.1C_experiential_software"
  | "1.1D_cloud_utility_saas"
  | "1.2_physical_inventory"
  | "1.3_media_content_ip"
  | "2.1_solo_freelance"
  | "2.2_agency_managed"
  | "3.1_platform_marketplace"
  | "3.2_affiliate_lead_gen"
  | "3.3_financial_capital";

export type ExtractedData = Record<string, string>;

/** Recent conversation turn for dynamic context resolution. */
export type ContextualExampleHistoryEntry = {
  role: string;
  text: string;
};

/** Inputs for Pass B context-locked hint generation. */
export type ContextualExampleResolverContext = {
  extractedData: ExtractedData;
  /** Locked value for inspiration_baseline when validated. */
  inspirationBaseline?: string;
  /** Runtime-generated domain blueprint — primary hint anchor when present. */
  dynamicContextAnchor?: string;
  history: ContextualExampleHistoryEntry[];
};

export type DataPointGenerationMode = "user_input" | "ai_predict";

export type DataPointSection = "user_acquisition" | "backend_generation";

export type ForcedChoices = {
  a: string;
  b: string;
  /** Full option list for multiple-choice escalation (3+ allowed values). */
  options?: readonly string[];
};

export type ActiveQuestionContext = {
  key: string;
  isMultipleChoice: boolean;
  section: DataPointSection;
  choiceOptions: readonly string[] | null;
};

export type GauntletException =
  | "category_drift"
  | "two_ideas"
  | "circular_pivot"
  | "budget_ambition_paradox"
  | "premature_jump"
  | "pivot_reset"
  | null;

export type OnboardingSessionState = {
  projectId: string | null;
  category: string;
  currentStage: GauntletStage;
  activeDataPoint: string;
  escalationAttempt: EscalationAttempt;
  isInputLocked: boolean;
  /** True when activeDataPoint uses ai_predict generation routing. */
  isCurrentFieldPredicted: boolean;
  extractedData: ExtractedData;
  forcedChoices: ForcedChoices | null;
  activeException: GauntletException;
  backwardEditCount: number;
};

export type DataPointDefinition = {
  key: string;
  stage: GauntletStage;
  isFoundation: boolean;
  /** Routes execution: user supplies vs AI predicts for user validation. */
  generationMode: DataPointGenerationMode;
  /** When true, Pass A validates strictly against allowedValues and the UI renders choice buttons. */
  isMultipleChoice: boolean;
  /** user_acquisition = chat-facing questions; backend_generation = hidden milestone metrics. */
  section: DataPointSection;
  /** Pass A validation criteria — aligned with targetIntent semantics. */
  analystCriteria: string;
  /** Backend-only semantic goal; Pass B synthesizes from this, never quotes baseline verbatim. */
  targetIntent: string;
  /** Backend reference phrasing for intent alignment — NEVER surfaced verbatim in Pass B output. */
  referenceBaseline: string;
  guardrailFocus: string;
  streetSmartLabel: string;
  allowedValues?: readonly string[];
};

export type StageMask = {
  stage: GauntletStage;
  customerLanguage: string;
};

export type CategoryTrackConfig = {
  id: string;
  customerModelLanguage: string;
  triageAliases: readonly string[];
  stages: readonly StageMask[];
  dataPoints: readonly DataPointDefinition[];
};

export type PassAAnalysis = {
  activeDataPointQuality: "specific" | "vague" | "empty" | "forced_choice" | "clear";
  activeDataPointValue: string | null;
  extractedFields: Record<string, string | null>;
  skippedFieldKeys: string[];
  detectedCategory: string | null;
  categoryDrift: boolean;
  twoIdeasConflict: boolean;
  pivotDetected: boolean;
  budgetAmbitionParadox: boolean;
  prematureStageJump: boolean;
  backwardEditRequest: boolean;
  forcedChoices: ForcedChoices | null;
};

export type TriagePassAAnalysis = {
  classifiedCategory: BusinessCategoryId | null;
  isPitchValid: boolean;
  isSplitParadoxDetected: boolean;
};

export type PassBContext = {
  state: OnboardingSessionState;
  categoryConfig: CategoryTrackConfig | null;
  passA: PassAAnalysis;
  /** Active data point key at Pass A evaluation time (before state commit). */
  passAActiveDataPointKey?: string;
  userMessage: string;
  conversationSummary: string;
  exceptionScript: GauntletException;
  nextDataPoint: DataPointDefinition | null;
  newlySkippedKeys: string[];
  resolvedActiveValue: string | null;
  isPendingOpening?: boolean;
  triageJustCompleted?: boolean;
  triageInvalidPitch?: boolean;
  useVerbatimResponse?: string | null;
};

export type GauntletChatResponse = {
  message: string;
  state: OnboardingSessionState;
  forcedChoices: ForcedChoices | null;
  isInputLocked: boolean;
  activeQuestion: ActiveQuestionContext | null;
};

export const INITIAL_SESSION_DEFAULTS: Omit<
  OnboardingSessionState,
  "projectId" | "category" | "activeDataPoint"
> = {
  currentStage: 1,
  escalationAttempt: 1,
  isInputLocked: false,
  isCurrentFieldPredicted: false,
  extractedData: {},
  forcedChoices: null,
  activeException: null,
  backwardEditCount: 0,
};

export const TAXONOMY_FORBIDDEN_PHRASES = [
  "category",
  "stage",
  "data point",
  "triage",
  "routing you to",
  "track",
  "schema",
  "escalation",
  "attempt 1",
  "attempt 2",
  "attempt 3",
  "pillar",
  "1.1",
  "1.1a",
  "1.1b",
  "1.1c",
  "1.1d",
  "1.2",
  "1.3",
  "2.1",
  "2.2",
  "3.1",
  "3.2",
  "3.3",
  "static_assets",
  "ecosystem_extensions",
  "experiential_software",
  "cloud_utility_saas",
  "physical_inventory",
  "platform_marketplace",
] as const;

export const EXCEPTION_SCRIPTS: Record<
  Exclude<GauntletException, null>,
  string
> = {
  category_drift:
    "Switching from a digital tool to a physical storefront changes how we have to map out this business entirely. The strategy we're mapping right now is engineered for an online platform. If you want to pivot to a physical location strategy, we need to reset and run that model instead. Do you want to switch gears completely, or keep focusing on the digital platform side?",
  two_ideas:
    "Whoa, hold on. A dentist scheduling tool and a mushroom farming business are two entirely different universes. We can't build an engine for both at the same time. Pick one to run through the gauntlet right now—we can stress-test the other one later.",
  circular_pivot:
    "Understood. Let's update the foundation. If we are shifting the focus to gym owners instead of who we talked about earlier, that changes the main problem we are solving. Let's lock this new audience in first: what is the single biggest operational headache these gym owners face daily?",
  budget_ambition_paradox:
    "The build path you're describing needs real cash and hours behind it. Right now the math doesn't add up—a heavy custom build on zero budget and a couple hours a week burns runway without moving the needle. We need to balance what you're willing to spend and the time you can actually put in before we map the next step.",
  premature_jump:
    "Worrying about manufacturing logistics, building a custom app, or buying inventory right now is a massive trap. If we don't lock down the exact friction of your starting customer first, we risk spending thousands building a perfect solution for a problem that nobody actually has. Let's secure the foundation before we buy any tools: who is experiencing this pain point daily?",
  pivot_reset:
    "Understood. Shifting from an online skincare brand to a local physical spa changes how the business works completely. Let's briefly re-verify your core target customer and the main reason they are paying you for this new direction before we map out the operational setup again.",
};
