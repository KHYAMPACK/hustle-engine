import { formatUnknownError } from "@/lib/format-error";
import type { ForcedChoices, OnboardingSessionState } from "@/lib/ai/gauntlet/types";
import type { UIMessage } from "ai";

export type GauntletChatPayload = {
  message: string;
  state: OnboardingSessionState;
  forcedChoices: ForcedChoices | null;
  isInputLocked: boolean;
};

export type GauntletChatRequest = {
  messages: UIMessage[];
  projectId?: string | null;
  forcedChoice?: "a" | "b";
  requestOpening?: boolean;
};

export async function postGauntletChat(
  body: GauntletChatRequest,
): Promise<GauntletChatPayload> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as GauntletChatPayload & {
    error?: string;
    details?: string;
  };

  if (!response.ok) {
    const message = formatUnknownError(
      payload.details ?? payload.error ?? "Chat request failed.",
    );
    throw new Error(message);
  }

  return payload;
}
