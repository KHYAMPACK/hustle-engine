import { type ResourceConflictContext } from "@/lib/ai/gauntlet/context-guardrails";
import {
  runPassAAnalyst,
  type PassAAnalysisResult,
} from "@/lib/ai/gauntlet/pass-a-analyst";
import type { OnboardingSessionState } from "@/lib/ai/gauntlet/types";

export type UnifiedTurnAnalysis = PassAAnalysisResult;

export async function runUnifiedTurnAnalysis(
  state: OnboardingSessionState,
  userMessage: string,
  conversationSummary: string,
): Promise<UnifiedTurnAnalysis> {
  return runPassAAnalyst(state, userMessage, conversationSummary);
}

export type { ResourceConflictContext };
