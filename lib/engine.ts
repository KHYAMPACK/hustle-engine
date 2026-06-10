import type { ExtractedData } from "@/lib/ai/gauntlet/types";
import { CATEGORY_FIELD_KEY } from "@/lib/ai/gauntlet/scoping-fields";

/** Flat onboarding inputs sourced from `extractedData`. */
export type ProjectMetricsInput = {
  category: string;
  validation_goal: string;
  available_time: string;
  budget: string;
};

export type RiskLevel = "Low" | "Medium" | "High";

export type ProjectMetrics = {
  doabilityScore: number;
  requiredCapital: number;
  riskLevel: RiskLevel;
  techStack: string[];
};

const REQUIRED_ONBOARDING_KEYS = [
  CATEGORY_FIELD_KEY,
  "validation_goal",
  "available_time",
  "budget",
] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function pickField(extractedData: ExtractedData, key: string): string {
  return extractedData[key]?.trim() ?? "";
}

function parseNumericToken(raw: string): number {
  const match = raw.replace(/,/g, "").match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

export function parseOnboardingAnswers(
  extractedData: ExtractedData,
): ProjectMetricsInput | null {
  const parsed: ProjectMetricsInput = {
    category: pickField(extractedData, CATEGORY_FIELD_KEY),
    validation_goal: pickField(extractedData, "validation_goal"),
    available_time: pickField(extractedData, "available_time"),
    budget: pickField(extractedData, "budget"),
  };

  const complete = REQUIRED_ONBOARDING_KEYS.every(
    (key) => pickField(extractedData, key).length > 0,
  );

  return complete ? parsed : null;
}

/**
 * Placeholder metric pass — real feasibility formulas will replace this later.
 * Uses only the new flat string inputs; no legacy summary/skill heuristics.
 */
export function calculateProjectMetrics(
  input: ProjectMetricsInput,
): ProjectMetrics {
  const hoursPerWeek = parseNumericToken(input.available_time);
  const maxBudget = parseNumericToken(input.budget);
  const validationDepth = input.validation_goal.trim().length;
  const categoryDepth = input.category.trim().length;

  const doabilityScore = clamp(
    Math.round(validationDepth + hoursPerWeek),
    1,
    100,
  );

  const requiredCapital = maxBudget > 0 ? maxBudget : validationDepth + categoryDepth;

  let riskLevel: RiskLevel = "Medium";
  if (maxBudget > 0 && hoursPerWeek > 0) {
    riskLevel = maxBudget >= requiredCapital ? "Low" : "High";
  } else if (maxBudget === 0 && hoursPerWeek === 0) {
    riskLevel = "Medium";
  } else {
    riskLevel = "High";
  }

  const techStack = input.category ? [input.category] : ["pending"];

  return {
    doabilityScore,
    requiredCapital,
    riskLevel,
    techStack,
  };
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
