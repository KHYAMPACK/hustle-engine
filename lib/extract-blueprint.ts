import {
  finalizeBlueprintSchema,
  type VentureBlueprint,
} from "@/lib/blueprint-schema";
import type { UIMessage } from "ai";

function parseBlueprintPayload(data: unknown): VentureBlueprint | null {
  const result = finalizeBlueprintSchema.safeParse(data);
  return result.success ? result.data : null;
}

function readToolPart(part: UIMessage["parts"][number]): VentureBlueprint | null {
  const isFinalizeTool =
    part.type === "tool-finalizeBlueprint" ||
    (part.type === "dynamic-tool" && part.toolName === "finalizeBlueprint");

  if (!isFinalizeTool) {
    return null;
  }

  if (part.state === "output-available") {
    return parseBlueprintPayload(part.output);
  }

  if (
    part.state === "input-available" ||
    part.state === "approval-responded"
  ) {
    return parseBlueprintPayload(part.input);
  }

  return null;
}

export function extractFinalizeBlueprintFromMessages(
  messages: UIMessage[],
): VentureBlueprint | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "assistant") {
      continue;
    }

    for (const part of message.parts) {
      const blueprint = readToolPart(part);
      if (blueprint) {
        return blueprint;
      }
    }
  }

  return null;
}

export function messageHasFinalizeBlueprintTool(message: UIMessage): boolean {
  return message.parts.some(
    (part) =>
      part.type === "tool-finalizeBlueprint" ||
      (part.type === "dynamic-tool" && part.toolName === "finalizeBlueprint"),
  );
}
