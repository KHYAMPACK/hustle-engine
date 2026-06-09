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

export type ForcedChoices = {
  a: string;
  b: string;
  options?: readonly string[];
};

export type ActiveQuestionContext = {
  key: string;
  isMultipleChoice: boolean;
  section: "user_acquisition";
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
  /** Mirrors extracted_data.category when set; otherwise "pending". */
  category: string;
  currentStage: GauntletStage;
  activeDataPoint: string;
  escalationAttempt: EscalationAttempt;
  isInputLocked: boolean;
  isCurrentFieldPredicted: boolean;
  extractedData: ExtractedData;
  forcedChoices: ForcedChoices | null;
  activeException: GauntletException;
  backwardEditCount: number;
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
