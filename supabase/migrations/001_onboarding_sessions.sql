-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query)

create table if not exists public.onboarding_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid null,
  category text not null default 'pending',
  current_stage int not null default 1 check (current_stage between 1 and 5),
  active_data_point text not null default 'pitch',
  escalation_attempt int not null default 1 check (escalation_attempt between 1 and 3),
  is_input_locked boolean not null default false,
  extracted_data jsonb not null default '{}'::jsonb,
  forced_choice_a text null,
  forced_choice_b text null,
  active_exception text null,
  backward_edit_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists onboarding_sessions_user_active_idx
  on public.onboarding_sessions (user_id)
  where project_id is null;

alter table public.onboarding_sessions enable row level security;

create policy "Users read own onboarding sessions"
  on public.onboarding_sessions
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own onboarding sessions"
  on public.onboarding_sessions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own onboarding sessions"
  on public.onboarding_sessions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own onboarding sessions"
  on public.onboarding_sessions
  for delete
  to authenticated
  using (auth.uid() = user_id);
