/**
 * Expected Supabase `projects` table (create manually):
 *
 * create table projects (
 *   id uuid primary key default gen_random_uuid(),
 *   user_id text not null,
 *   title text not null,
 *   doability_score int not null,
 *   required_capital numeric not null,
 *   risk_level text not null,
 *   tech_stack jsonb not null,
 *   dynamic_milestones jsonb not null,
 *   is_active boolean not null default false,
 *   created_at timestamptz not null default now()
 * );
 */

import type { MilestoneBlueprint, VentureBlueprint } from "@/lib/blueprint-schema";
import { finalizeBlueprintSchema } from "@/lib/blueprint-schema";
import { normalizeMilestones } from "@/lib/milestone-progress";
import { createClient } from "@/lib/supabase";
import type { UIMessage } from "ai";

export type ProjectRecord = {
  id: string;
  user_id: string;
  title: string;
  doability_score: number;
  required_capital: number;
  risk_level: string;
  tech_stack: string[];
  dynamic_milestones: VentureBlueprint["dynamicMilestones"];
  is_active: boolean;
  created_at: string;
};

export function deriveProjectTitle(
  blueprint: VentureBlueprint,
  messages: UIMessage[],
): string {
  const firstUserMessage = messages.find((message) => message.role === "user");
  if (firstUserMessage) {
    const text = firstUserMessage.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(" ")
      .trim();

    if (text.length > 0) {
      return text.length > 80 ? `${text.slice(0, 77)}...` : text;
    }
  }

  return blueprint.dynamicMilestones[0]?.title ?? "My Venture";
}

export function blueprintFromRecord(record: ProjectRecord): VentureBlueprint {
  const parsed = finalizeBlueprintSchema.parse({
    doabilityScore: record.doability_score,
    requiredCapital: record.required_capital,
    riskLevel: record.risk_level,
    techStack: record.tech_stack,
    dynamicMilestones: record.dynamic_milestones,
  });

  return {
    ...parsed,
    dynamicMilestones: normalizeMilestones(parsed.dynamicMilestones),
  };
}

export async function updateGuestProjectMilestones(
  projectId: string,
  milestones: MilestoneBlueprint[],
  userId: string,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("projects")
    .update({ dynamic_milestones: normalizeMilestones(milestones) })
    .eq("id", projectId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function saveGuestProject(
  blueprint: VentureBlueprint,
  title: string,
  userId: string,
): Promise<ProjectRecord> {
  const supabase = createClient();

  const row = {
    user_id: userId,
    title,
    doability_score: blueprint.doabilityScore,
    required_capital: blueprint.requiredCapital,
    risk_level: blueprint.riskLevel,
    tech_stack: blueprint.techStack,
    dynamic_milestones: normalizeMilestones(blueprint.dynamicMilestones),
    is_active: false,
  };

  const { data, error } = await supabase
    .from("projects")
    .insert(row)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as ProjectRecord;
}

export async function activateGuestProject(
  projectId: string,
  userId: string,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("projects")
    .update({ is_active: true })
    .eq("id", projectId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function fetchAllGuestProjects(
  userId: string,
): Promise<ProjectRecord[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as ProjectRecord[];
}

export async function fetchGuestProject(
  userId: string,
): Promise<ProjectRecord | null> {
  const projects = await fetchAllGuestProjects(userId);
  return projects[0] ?? null;
}
