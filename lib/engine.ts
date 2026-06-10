import type { ExtractedData } from "@/lib/ai/gauntlet/types";
import { PROMPTED_FIELD_KEYS } from "@/lib/ai/gauntlet/scoping-fields";

/** Flat onboarding inputs sourced from `extractedData`. */
export type ProjectMetricsInput = {
  category: string;
  end_goal: string;
  assumption: string;
  skills: string;
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
  const parsed = {
    category: pickField(extractedData, "category"),
    end_goal: pickField(extractedData, "end_goal"),
    assumption: pickField(extractedData, "assumption"),
    skills: pickField(extractedData, "skills"),
    available_time: pickField(extractedData, "available_time"),
    budget: pickField(extractedData, "budget"),
  } satisfies ProjectMetricsInput;

  const complete = PROMPTED_FIELD_KEYS.every(
    (key) => pickField(extractedData, key).length > 0,
  );

  return complete ? parsed : null;
}

/**
 * Placeholder metric pass — real feasibility formulas will replace this later.
 */
export function calculateProjectMetrics(
  input: ProjectMetricsInput,
): ProjectMetrics {
  const hoursPerWeek = parseNumericToken(input.available_time);
  const maxBudget = parseNumericToken(input.budget);
  const signalLength =
    input.end_goal.trim().length +
    input.assumption.trim().length +
    input.skills.trim().length;

  const doabilityScore = clamp(Math.round(signalLength + hoursPerWeek), 1, 100);
  const requiredCapital = maxBudget > 0 ? maxBudget : signalLength;
  const riskLevel: RiskLevel =
    maxBudget > 0 && hoursPerWeek > 0
      ? maxBudget >= requiredCapital
        ? "Low"
        : "High"
      : "Medium";
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
