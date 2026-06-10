import { buildPassBPrompt } from "@/lib/ai/gauntlet/pass-b-persona";
import { isExtractionComplete } from "@/lib/ai/gauntlet/scoping-fields";
import type { ResourceConflictContext } from "@/lib/ai/gauntlet/context-guardrails";
import type { OnboardingSessionState } from "@/lib/ai/gauntlet/types";
import { generateContentWithRetry } from "@/lib/ai/gemini-client";

export type PersonaResponseContext = {
  state: OnboardingSessionState;
  userMessage: string;
  conversationSummary: string;
  isOpening?: boolean;
  newlyCapturedKeys?: string[];
  suggestedNextFieldKey?: string | null;
  resourceConflict?: ResourceConflictContext;
};

export async function runPersonaResponse(
  context: PersonaResponseContext,
): Promise<string> {
  const prompt = buildPassBPrompt(context);

  const response = await generateContentWithRetry({
    model: "gemini-2.5-flash-lite",
    contents: prompt,
    config: {
      temperature: 0.7,
    },
  });

  const text = response.text?.trim();
  if (!text) {
    if (context.isOpening) {
      return "Hey — pull up a chair. Walk me through what you're building and what you're starting with. We'll stress-test it together.";
    }

    if (isExtractionComplete(context.state.extractedData)) {
      return "I think we've got a solid read on this. Anything you'd tweak before we keep going?";
    }

    return "Got it — tell me a bit more so we can keep shaping this in your world, not mine.";
  }

  return text;
}
