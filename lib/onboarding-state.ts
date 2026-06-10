/**
 * Expected Supabase `onboarding_sessions` table (create manually):
 *
 * create table onboarding_sessions (
 *   id uuid primary key default gen_random_uuid(),
 *   user_id uuid not null references auth.users(id) on delete cascade,
 *   project_id uuid null,
 *   category text not null default 'pending',
 *   current_stage int not null default 1 check (current_stage between 1 and 5),
 *   active_data_point text not null default 'pitch',
 *   escalation_attempt int not null default 1 check (escalation_attempt between 1 and 3),
 *   is_input_locked boolean not null default false,
 *   extracted_data jsonb not null default '{}'::jsonb,
 *   forced_choice_a text null,
 *   forced_choice_b text null,
 *   active_exception text null,
 *   backward_edit_count int not null default 0,
 *   created_at timestamptz not null default now(),
 *   updated_at timestamptz not null default now()
 * );
 *
 * create unique index onboarding_sessions_user_active_idx
 *   on onboarding_sessions (user_id)
 *   where project_id is null;
 */

import { formatUnknownError } from "@/lib/format-error";
import {
  createPendingSessionState,
  refreshSessionProgress,
} from "@/lib/ai/gauntlet/session-defaults";
import { seedExtractedData, CATEGORY_FIELD_KEY } from "@/lib/ai/gauntlet/scoping-fields";
import {
  isPendingCategory,
  isValidBusinessCategory,
  PENDING_CATEGORY,
  resolveClassifiedCategory,
} from "@/lib/ai/gauntlet/taxonomy";
import type {
  ExtractedData,
  ForcedChoices,
  GauntletException,
  GauntletStage,
  OnboardingSessionState,
} from "@/lib/ai/gauntlet/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type OnboardingSessionRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  category: string;
  current_stage: number;
  active_data_point: string;
  escalation_attempt: number;
  is_input_locked: boolean;
  extracted_data: ExtractedData;
  forced_choice_a: string | null;
  forced_choice_b: string | null;
  active_exception: string | null;
  backward_edit_count: number;
};

function repairLegacySessionState(
  state: Omit<OnboardingSessionState, "isCurrentFieldPredicted">,
): Omit<OnboardingSessionState, "isCurrentFieldPredicted"> {
  const repairedBase = {
    ...state,
    isInputLocked: false,
    forcedChoices: null,
    escalationAttempt: 1 as const,
    activeException: null,
  };

  if (isPendingCategory(state.category)) {
    return {
      ...repairedBase,
      category: PENDING_CATEGORY,
      extractedData: seedExtractedData(),
    };
  }

  const resolvedCategory = resolveClassifiedCategory(state.category);
  const hasConfirmedColumnCategory =
    resolvedCategory !== null && isValidBusinessCategory(resolvedCategory);

  const extractedData = seedExtractedData(state.extractedData);

  if (!hasConfirmedColumnCategory) {
    extractedData[CATEGORY_FIELD_KEY] = "";
    return {
      ...repairedBase,
      category: PENDING_CATEGORY,
      extractedData,
    };
  }

  if (!extractedData[CATEGORY_FIELD_KEY]?.trim()) {
    extractedData[CATEGORY_FIELD_KEY] = resolvedCategory;
  }

  return {
    ...repairedBase,
    category: resolvedCategory,
    extractedData,
  };
}

function hydrateSessionState(
  state: Omit<OnboardingSessionState, "isCurrentFieldPredicted">,
): OnboardingSessionState {
  return refreshSessionProgress({
    ...repairLegacySessionState(state),
    isCurrentFieldPredicted: false,
  });
}

function rowToState(row: OnboardingSessionRow): OnboardingSessionState {
  const forcedChoices: ForcedChoices | null =
    row.forced_choice_a && row.forced_choice_b
      ? { a: row.forced_choice_a, b: row.forced_choice_b }
      : null;

  return hydrateSessionState({
    projectId: row.project_id,
    category: row.category,
    currentStage: row.current_stage as GauntletStage,
    activeDataPoint: row.active_data_point,
    escalationAttempt: row.escalation_attempt as 1 | 2 | 3,
    isInputLocked: row.is_input_locked,
    extractedData: seedExtractedData(row.extracted_data ?? {}),
    forcedChoices,
    activeException: (row.active_exception as GauntletException) ?? null,
    backwardEditCount: row.backward_edit_count,
  });
}

function stateToRow(state: OnboardingSessionState, userId: string) {
  const normalized = refreshSessionProgress(state);

  return {
    user_id: userId,
    project_id: normalized.projectId,
    category: normalized.category,
    current_stage: normalized.currentStage,
    active_data_point: normalized.activeDataPoint,
    escalation_attempt: normalized.escalationAttempt,
    is_input_locked: normalized.isInputLocked,
    extracted_data: normalized.extractedData,
    forced_choice_a: normalized.forcedChoices?.a ?? null,
    forced_choice_b: normalized.forcedChoices?.b ?? null,
    active_exception: normalized.activeException,
    backward_edit_count: normalized.backwardEditCount,
    updated_at: new Date().toISOString(),
  };
}

export async function loadOnboardingSession(
  supabase: SupabaseClient,
  userId: string,
  projectId?: string | null,
): Promise<OnboardingSessionState | null> {
  let query = supabase.from("onboarding_sessions").select("*").eq("user_id", userId);

  if (projectId) {
    query = query.eq("project_id", projectId);
  } else {
    query = query.is("project_id", null);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(formatUnknownError(error));
  }

  if (!data) {
    return null;
  }

  return rowToState(data as OnboardingSessionRow);
}

export async function createOnboardingSession(
  supabase: SupabaseClient,
  userId: string,
  projectId: string | null = null,
): Promise<OnboardingSessionState> {
  const state = createPendingSessionState(projectId);

  const { data, error } = await supabase
    .from("onboarding_sessions")
    .insert(stateToRow(state, userId))
    .select("*")
    .single();

  if (error) {
    throw new Error(formatUnknownError(error));
  }

  return rowToState(data as OnboardingSessionRow);
}

export async function saveOnboardingSession(
  supabase: SupabaseClient,
  userId: string,
  state: OnboardingSessionState,
): Promise<OnboardingSessionState> {
  const payload = stateToRow(state, userId);

  let query = supabase
    .from("onboarding_sessions")
    .update(payload)
    .eq("user_id", userId);

  if (state.projectId) {
    query = query.eq("project_id", state.projectId);
  } else {
    query = query.is("project_id", null);
  }

  const { data, error } = await query.select("*").single();

  if (error) {
    throw new Error(formatUnknownError(error));
  }

  return rowToState(data as OnboardingSessionRow);
}

export async function getOrCreateOnboardingSession(
  supabase: SupabaseClient,
  userId: string,
  projectId: string | null = null,
): Promise<OnboardingSessionState> {
  const existing = await loadOnboardingSession(supabase, userId, projectId);
  if (existing) {
    return existing;
  }
  return createOnboardingSession(supabase, userId, projectId);
}

export async function resetOnboardingSession(
  supabase: SupabaseClient,
  userId: string,
  projectId: string | null = null,
): Promise<void> {
  let query = supabase
    .from("onboarding_sessions")
    .delete()
    .eq("user_id", userId);

  if (projectId) {
    query = query.eq("project_id", projectId);
  } else {
    query = query.is("project_id", null);
  }

  const { error } = await query;

  if (error) {
    throw new Error(formatUnknownError(error));
  }
}
