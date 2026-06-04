export type ProjectMetricsInput = {
  projectSummary: string;
  skillLevel: number;
  hoursPerWeek: number;
  maxBudget: number;
};

export type RiskLevel = "Low" | "Medium" | "High";

export type ProjectMetrics = {
  doabilityScore: number;
  requiredCapital: number;
  riskLevel: RiskLevel;
  techStack: string[];
};

const BASE_MVP_COST = 50;

const SUMMARY_COST_RULES: { keywords: string[]; cost: number }[] = [
  { keywords: ["database", "db", "postgres", "supabase"], cost: 0 },
  { keywords: ["ai", "llm", "gpt", "openai", "machine learning"], cost: 20 },
  { keywords: ["email", "mail", "newsletter", "transactional"], cost: 0 },
  { keywords: ["payment", "stripe", "checkout", "billing"], cost: 0 },
  { keywords: ["mobile", "ios", "android"], cost: 99 },
  { keywords: ["game", "unity", "godot"], cost: 150 },
  { keywords: ["domain", "hosting"], cost: 15 },
];

const COMPLEXITY_KEYWORDS = [
  "ai",
  "llm",
  "machine learning",
  "mobile",
  "game",
  "payment",
  "real-time",
  "multiplayer",
  "blockchain",
  "video",
  "marketplace",
];

function normalizeSummary(summary: string): string {
  return summary.toLowerCase();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function estimateRequiredCapital(summary: string): number {
  const normalized = normalizeSummary(summary);
  let total = BASE_MVP_COST;

  for (const rule of SUMMARY_COST_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      total += rule.cost;
    }
  }

  return total;
}

function estimateComplexity(summary: string): number {
  const normalized = normalizeSummary(summary);
  let complexity = 1;

  for (const keyword of COMPLEXITY_KEYWORDS) {
    if (normalized.includes(keyword)) {
      complexity += 1;
    }
  }

  return complexity;
}

function buildTechStack(summary: string): string[] {
  const normalized = normalizeSummary(summary);
  const stack = new Set<string>(["Vercel"]);

  if (
    normalized.includes("database") ||
    normalized.includes("db") ||
    normalized.includes("auth") ||
    normalized.includes("saas") ||
    normalized.includes("app") ||
    normalized.includes("web")
  ) {
    stack.add("Supabase");
  }

  if (
    normalized.includes("email") ||
    normalized.includes("mail") ||
    normalized.includes("newsletter") ||
    normalized.includes("notification")
  ) {
    stack.add("Resend");
  }

  if (stack.size === 1) {
    stack.add("Supabase");
  }

  return Array.from(stack);
}

function calculateRiskLevel(
  requiredCapital: number,
  maxBudget: number,
  complexity: number,
): RiskLevel {
  const complexityFloor = requiredCapital * (1 + complexity * 0.15);

  if (maxBudget < requiredCapital) {
    return "High";
  }

  if (maxBudget < complexityFloor) {
    return "Medium";
  }

  return "Low";
}

export function calculateProjectMetrics(
  input: ProjectMetricsInput,
): ProjectMetrics {
  const skillLevel = clamp(Math.round(input.skillLevel), 1, 5);
  const hoursPerWeek = Math.max(0, input.hoursPerWeek);
  const maxBudget = Math.max(0, input.maxBudget);

  const doabilityScore = Math.min(
    100,
    Math.round((skillLevel * hoursPerWeek)),
  );

  const requiredCapital = estimateRequiredCapital(input.projectSummary);
  const complexity = estimateComplexity(input.projectSummary);
  const riskLevel = calculateRiskLevel(
    requiredCapital,
    maxBudget,
    complexity,
  );
  const techStack = buildTechStack(input.projectSummary);

  return {
    doabilityScore,
    requiredCapital,
    riskLevel,
    techStack,
  };
}

export function parseOnboardingAnswers(
  userMessages: string[],
): ProjectMetricsInput | null {
  if (userMessages.length < 5) {
    return null;
  }

  const [summary, projectType, skillRaw, hoursRaw, budgetRaw] = userMessages;
  const projectSummary = `${summary} ${projectType}`.trim();

  const skillLevel = clamp(parseInt(skillRaw, 10) || 1, 1, 5);
  const hoursPerWeek =
    parseFloat(hoursRaw.replace(/[^\d.]/g, "")) || 0;
  const maxBudget =
    parseFloat(budgetRaw.replace(/[^\d.]/g, "")) || 0;

  return {
    projectSummary,
    skillLevel,
    hoursPerWeek,
    maxBudget,
  };
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
