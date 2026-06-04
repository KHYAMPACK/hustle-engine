import type { ProjectMetricsInput } from "@/lib/engine";

type OnboardingCompletePayload = {
  status: "complete";
  projectSummary: string;
  projectType: string;
  skillLevel: number;
  hoursPerWeek: number;
  maxBudget: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function extractJsonBlock(text: string): string | null {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    return text.slice(start, end + 1);
  }

  return null;
}

export function parseOnboardingComplete(
  text: string,
): ProjectMetricsInput | null {
  const jsonText = extractJsonBlock(text);
  if (!jsonText) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonText) as Partial<OnboardingCompletePayload>;

    if (parsed.status !== "complete") {
      return null;
    }

    if (
      typeof parsed.projectSummary !== "string" ||
      typeof parsed.projectType !== "string" ||
      parsed.projectSummary.trim() === "" ||
      parsed.projectType.trim() === ""
    ) {
      return null;
    }

    const skillLevel = clamp(Math.round(Number(parsed.skillLevel) || 1), 1, 5);
    const hoursPerWeek = Math.max(0, Number(parsed.hoursPerWeek) || 0);
    const maxBudget = Math.max(0, Number(parsed.maxBudget) || 0);

    return {
      projectSummary: `${parsed.projectSummary.trim()} ${parsed.projectType.trim()}`.trim(),
      skillLevel,
      hoursPerWeek,
      maxBudget,
    };
  } catch {
    return null;
  }
}
