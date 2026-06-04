import { finalizeBlueprintTool } from "@/lib/blueprint-schema";
import { ONBOARDING_SYSTEM_PROMPT } from "@/lib/onboarding-prompt";
import { google } from "@ai-sdk/google";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google("gemini-2.5-flash"),
    system: ONBOARDING_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: {
      finalizeBlueprint: finalizeBlueprintTool,
    },
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
