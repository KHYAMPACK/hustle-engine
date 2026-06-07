import { processGauntletTurn } from "@/lib/ai/gauntlet/process-turn";
import { formatUnknownError } from "@/lib/format-error";
import { isGeminiCapacityError } from "@/lib/ai/gemini-client";
import {
  getOrCreateOnboardingSession,
  saveOnboardingSession,
} from "@/lib/onboarding-state";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { UIMessage } from "ai";
import { NextResponse } from "next/server";

export const maxDuration = 60;

type ChatRequestBody = {
  messages?: UIMessage[];
  projectId?: string | null;
  forcedChoice?: "a" | "b";
  requestOpening?: boolean;
};

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { session: authSession },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !authSession?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as ChatRequestBody;
    const messages = body.messages ?? [];
    const projectId = body.projectId ?? null;
    const forcedChoice = body.forcedChoice;
    const requestOpening = body.requestOpening === true;

    let onboardingSession = await getOrCreateOnboardingSession(
      supabase,
      authSession.user.id,
      projectId,
    );

    if (onboardingSession.projectId !== projectId) {
      onboardingSession = {
        ...onboardingSession,
        projectId,
      };
    }

    const { response, session: nextSession } = await processGauntletTurn({
      messages: requestOpening ? [] : messages,
      session: onboardingSession,
      forcedChoice,
    });

    const savedSession = await saveOnboardingSession(
      supabase,
      authSession.user.id,
      nextSession,
    );

    return NextResponse.json({
      message: response.message,
      state: savedSession,
      forcedChoices: savedSession.forcedChoices,
      isInputLocked: savedSession.isInputLocked,
    });
  } catch (error) {
    console.error("Gauntlet chat pipeline error:", error);
    const details = formatUnknownError(error);
    const status = isGeminiCapacityError(error)
      ? 503
      : details.includes("onboarding_sessions") && details.includes("Could not find")
        ? 503
        : 500;

    return NextResponse.json(
      {
        error:
          status === 503 && isGeminiCapacityError(error)
            ? "AI temporarily unavailable"
            : status === 503
              ? "Database setup required"
              : "Internal processing error",
        details,
      },
      { status },
    );
  }
}
