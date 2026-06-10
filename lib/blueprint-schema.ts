import type { RiskLevel } from "@/lib/engine";
import { tool } from "ai";
import { z } from "zod";

export const milestoneSchema = z.object({
  title: z.string().min(1),
  validationOutcome: z.string().min(1),
  thinkTask: z.string().min(1),
  buildTask: z.string().min(1),
  thinkComplete: z.boolean().optional().default(false),
  buildComplete: z.boolean().optional().default(false),
});

export const finalizeBlueprintSchema = z.object({
  doabilityScore: z.number().min(1).max(100),
  requiredCapital: z.number().min(0),
  riskLevel: z.enum(["Low", "Medium", "High"]),
  techStack: z.array(z.string().min(1)).min(1),
  dynamicMilestones: z.array(milestoneSchema).length(4),
});

export type MilestoneBlueprint = z.infer<typeof milestoneSchema>;
export type VentureBlueprint = z.infer<typeof finalizeBlueprintSchema>;

export const finalizeBlueprintTool = tool({
  description:
    "Call this tool automatically once all six onboarding variables are captured (category, end_goal, assumption, skills, available_time, budget) to generate official project metrics and tasks. Do not call early. Populate every field with venture-specific, pragmatic values derived from the full conversation.",
  inputSchema: finalizeBlueprintSchema,
  execute: async (blueprint) => blueprint,
});

export function parseVentureBlueprint(data: unknown): VentureBlueprint | null {
  const result = finalizeBlueprintSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function blueprintToMetrics(
  blueprint: VentureBlueprint,
): {
  doabilityScore: number;
  requiredCapital: number;
  riskLevel: RiskLevel;
  techStack: string[];
} {
  return {
    doabilityScore: blueprint.doabilityScore,
    requiredCapital: blueprint.requiredCapital,
    riskLevel: blueprint.riskLevel,
    techStack: blueprint.techStack,
  };
}
