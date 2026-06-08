import { formatUnknownError } from "@/lib/format-error";
import type {
  ActiveQuestionContext,
  ForcedChoices,
  OnboardingSessionState,
} from "@/lib/ai/gauntlet/types";
import type { UIMessage } from "ai";

export type GauntletChatPayload = {
  message: string;
  state: OnboardingSessionState;
  forcedChoices: ForcedChoices | null;
  isInputLocked: boolean;
  activeQuestion: ActiveQuestionContext | null;
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
  let response: Response;

  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(
      formatUnknownError(error).includes("Failed to fetch")
        ? "Could not reach the server. Make sure the app is running and try again."
        : formatUnknownError(error),
    );
  }

  let payload = {} as GauntletChatPayload & {
    error?: string;
    details?: string;
  };

  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    throw new Error(
      response.ok
        ? "The server returned an invalid response."
        : `Chat request failed (${response.status}).`,
    );
  }

  if (!response.ok) {
    const message = formatUnknownError(
      payload.error ?? payload.details ?? "Chat request failed.",
    );
    throw new Error(message);
  }

  return payload;
}
