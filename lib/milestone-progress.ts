import type { MilestoneBlueprint } from "@/lib/blueprint-schema";

export function normalizeMilestone(
  milestone: MilestoneBlueprint,
): MilestoneBlueprint {
  return {
    ...milestone,
    thinkComplete: milestone.thinkComplete ?? false,
    buildComplete: milestone.buildComplete ?? false,
  };
}

export function normalizeMilestones(
  milestones: MilestoneBlueprint[],
): MilestoneBlueprint[] {
  return milestones.map(normalizeMilestone);
}

export function getActivePhaseIndex(milestones: MilestoneBlueprint[]): number {
  const firstIncomplete = milestones.findIndex(
    (milestone) => !(milestone.thinkComplete && milestone.buildComplete),
  );

  return firstIncomplete === -1 ? milestones.length - 1 : firstIncomplete;
}

export type MilestoneTimelineStatus = "done" | "active" | "locked";

export function getMilestoneTimelineStatus(
  index: number,
  milestones: MilestoneBlueprint[],
  activeIndex: number,
): MilestoneTimelineStatus {
  const milestone = milestones[index];

  if (milestone.thinkComplete && milestone.buildComplete) {
    return "done";
  }

  if (index === activeIndex) {
    return "active";
  }

  if (index > activeIndex) {
    return "locked";
  }

  return "active";
}

export function calculateTaskProgressPercent(
  milestones: MilestoneBlueprint[],
): number {
  const totalTasks = milestones.length * 2;
  if (totalTasks === 0) {
    return 0;
  }

  const completedTasks = milestones.reduce(
    (count, milestone) =>
      count +
      (milestone.thinkComplete ? 1 : 0) +
      (milestone.buildComplete ? 1 : 0),
    0,
  );

  return Math.round((completedTasks / totalTasks) * 100);
}
