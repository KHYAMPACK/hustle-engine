"use client";

import { blueprintToMetrics } from "@/lib/blueprint-schema";
import type { VentureBlueprint } from "@/lib/blueprint-schema";
import { LeanLedger } from "@/app/onboarding/LeanLedger";
import { getMessageText, WELCOME_MESSAGE_TEXT } from "@/lib/chat-utils";
import {
  extractFinalizeBlueprintFromMessages,
  messageHasFinalizeBlueprintTool,
} from "@/lib/extract-blueprint";
import { formatUsd, type RiskLevel } from "@/lib/engine";
import {
  calculateTaskProgressPercent,
  getActivePhaseIndex,
  getMilestoneTimelineStatus,
  normalizeMilestones,
} from "@/lib/milestone-progress";
import {
  activateGuestProject,
  blueprintFromRecord,
  deriveProjectTitle,
  fetchAllGuestProjects,
  saveGuestProject,
  updateGuestProjectMilestones,
  type ProjectRecord,
} from "@/lib/projects";
import { createClient } from "@/lib/supabase";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FormEvent,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

const INITIAL_UI_MESSAGE: UIMessage = {
  id: "welcome",
  role: "assistant",
  parts: [{ type: "text", text: WELCOME_MESSAGE_TEXT }],
};

const RISK_STYLES: Record<
  RiskLevel,
  { badge: string; description: string }
> = {
  Low: {
    badge:
      "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
    description:
      "Your budget comfortably covers the estimated MVP baseline for this scope.",
  },
  Medium: {
    badge: "border-amber-500/50 bg-amber-500/10 text-amber-400",
    description:
      "Runway is workable, but little margin for scope creep or unexpected tooling costs.",
  },
  High: {
    badge: "border-red-500/50 bg-red-500/10 text-red-400",
    description:
      "Maximum budget falls below the estimated launch baseline—scope or budget needs adjustment.",
  },
};

function FeasibilityMatrix({
  blueprint,
  onCommit,
}: {
  blueprint: VentureBlueprint;
  onCommit: () => void;
}) {
  const metrics = blueprintToMetrics(blueprint);
  const riskStyle = RISK_STYLES[metrics.riskLevel];

  return (
    <div className="flex w-full max-w-3xl flex-col gap-10">
      <header className="text-center">
        <p className="text-xs font-medium tracking-[0.35em] text-muted">
          FEASIBILITY MATRIX
        </p>
        <h1 className="mt-3 text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
          Review &amp; Commit Gate
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted">
          Validate the venture profile before you lock in your roadmap and begin
          execution.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <MatrixCard label="Doability Index">
          <p className="text-3xl font-medium tabular-nums text-foreground">
            {metrics.doabilityScore}
            <span className="text-lg text-muted">/100</span>
          </p>
          <p className="mt-2 text-sm text-muted">
            Derived from your skill level and weekly execution capacity.
          </p>
        </MatrixCard>

        <MatrixCard label="Required Capital">
          <p className="text-3xl font-medium tabular-nums text-foreground">
            {formatUsd(metrics.requiredCapital)}
          </p>
          <p className="mt-2 text-sm text-muted">
            Estimated bare-minimum MVP launch baseline from your project profile.
          </p>
        </MatrixCard>

        <MatrixCard label="Recommended Stack" className="sm:col-span-2">
          <ul className="flex flex-wrap gap-2">
            {metrics.techStack.map((tool) => (
              <li
                key={tool}
                className="rounded-sm border border-border px-3 py-1.5 text-sm font-medium text-foreground"
              >
                {tool}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">
            Lean 2026 defaults selected from your venture summary.
          </p>
        </MatrixCard>

        <MatrixCard label="Risk Horizon" className="sm:col-span-2">
          <div className="flex flex-wrap items-center gap-4">
            <span
              className={`inline-flex items-center rounded-sm border px-3 py-1 text-sm font-medium tracking-wide uppercase ${riskStyle.badge}`}
            >
              {metrics.riskLevel}
            </span>
            <p className="flex-1 text-sm leading-relaxed text-muted">
              {riskStyle.description}
            </p>
          </div>
        </MatrixCard>
      </div>

      <button
        type="button"
        onClick={onCommit}
        className="flex h-14 w-full items-center justify-center rounded-sm bg-foreground text-sm font-semibold tracking-[0.2em] text-background transition-opacity hover:opacity-90 sm:h-16 sm:text-base"
      >
        COMMIT AND LOCK IT IN
      </button>
    </div>
  );
}

function VentureSelector({
  allProjects,
  selectedProjectId,
  onSelectProject,
  onNewVenture,
}: {
  allProjects: ProjectRecord[];
  selectedProjectId: string | null;
  onSelectProject: (project: ProjectRecord) => void;
  onNewVenture: () => void;
}) {
  return (
    <div className="mb-6 border-b border-border pb-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-[0.25em] text-muted uppercase">
          Your Ventures
        </p>
        <button
          type="button"
          onClick={onNewVenture}
          className="rounded-sm border border-border px-2 py-1 text-xs font-medium text-foreground transition-colors hover:border-foreground/40 hover:bg-foreground/[0.04]"
          title="Start a new venture"
        >
          + New
        </button>
      </div>

      <ul className="mt-3 max-h-40 space-y-1.5 overflow-y-auto">
        {allProjects.map((project) => {
          const isSelected = project.id === selectedProjectId;

          return (
            <li key={project.id}>
              <button
                type="button"
                onClick={() => onSelectProject(project)}
                className={`w-full rounded-sm border px-3 py-2 text-left text-sm transition-colors ${
                  isSelected
                    ? "border-foreground/50 bg-foreground/[0.08] text-foreground"
                    : "border-transparent bg-foreground/[0.02] text-muted hover:border-border hover:text-foreground"
                }`}
              >
                <span className="line-clamp-2 leading-snug">{project.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ActiveProjectDashboard({
  blueprint,
  projectId,
  userId,
  allProjects,
  onBlueprintUpdate,
  onPersistError,
  onSelectProject,
  onNewVenture,
  onSignOut,
}: {
  blueprint: VentureBlueprint;
  projectId: string | null;
  userId: string;
  allProjects: ProjectRecord[];
  onBlueprintUpdate: (blueprint: VentureBlueprint) => void;
  onPersistError: (message: string | null) => void;
  onSelectProject: (project: ProjectRecord) => void;
  onNewVenture: () => void;
  onSignOut: () => void;
}) {
  const metrics = blueprintToMetrics(blueprint);
  const milestones = normalizeMilestones(blueprint.dynamicMilestones);
  const activePhaseIndex = getActivePhaseIndex(milestones);
  const activeMilestone = milestones[activePhaseIndex];
  const [focusActive, setFocusActive] = useState(false);
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progressPercent = calculateTaskProgressPercent(milestones);

  const monthlyBurnEstimate = Math.max(
    0,
    Math.round(metrics.requiredCapital / 6),
  );

  useEffect(() => {
    return () => {
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current);
      }
    };
  }, []);

  function scheduleMilestonePersist(nextMilestones: typeof milestones) {
    if (!projectId) {
      return;
    }

    if (persistTimeoutRef.current) {
      clearTimeout(persistTimeoutRef.current);
    }

    persistTimeoutRef.current = setTimeout(() => {
      void updateGuestProjectMilestones(projectId, nextMilestones, userId)
        .then(() => onPersistError(null))
        .catch((saveError) => {
          onPersistError(
            saveError instanceof Error
              ? saveError.message
              : "Failed to save task progress.",
          );
        });
    }, 400);
  }

  function updateTaskCompletion(
    phaseIndex: number,
    task: "think" | "build",
    checked: boolean,
  ) {
    const nextMilestones = milestones.map((milestone, index) => {
      if (index !== phaseIndex) {
        return milestone;
      }

      if (task === "think") {
        return {
          ...milestone,
          thinkComplete: checked,
          buildComplete: checked ? milestone.buildComplete : false,
        };
      }

      return {
        ...milestone,
        buildComplete: checked,
      };
    });

    onBlueprintUpdate({
      ...blueprint,
      dynamicMilestones: nextMilestones,
    });
    scheduleMilestonePersist(nextMilestones);
  }

  return (
    <main className="flex flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto grid w-full max-w-7xl gap-4 lg:grid-cols-12 lg:gap-5">
        {/* Column 1 — Macro Map */}
        <aside className="flex flex-col rounded-sm border border-border bg-foreground/[0.02] p-5 lg:col-span-3 lg:p-6">
          <VentureSelector
            allProjects={allProjects}
            selectedProjectId={projectId}
            onSelectProject={onSelectProject}
            onNewVenture={onNewVenture}
          />

          <p className="text-xs font-medium tracking-[0.25em] text-muted uppercase">
            Macro Map
          </p>

          <div className="mt-6">
            <p className="text-sm text-muted">Project Progress</p>
            <p className="mt-1 text-2xl font-medium tabular-nums text-foreground">
              {progressPercent}%
            </p>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-foreground transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <ol className="mt-8 space-y-0">
            {milestones.map((milestone, index) => {
              const status = getMilestoneTimelineStatus(
                index,
                milestones,
                activePhaseIndex,
              );
              const isDone = status === "done";
              const isActive = status === "active";
              const isLocked = status === "locked";

              return (
                <li
                  key={milestone.title}
                  className={`relative flex gap-3 pb-8 last:pb-0 ${
                    isLocked ? "select-none blur-[2px] opacity-40" : ""
                  }`}
                >
                  {index < milestones.length - 1 && (
                    <span
                      className={`absolute left-[11px] top-6 h-[calc(100%-12px)] w-px ${
                        isDone ? "bg-foreground/50" : "bg-border"
                      }`}
                      aria-hidden
                    />
                  )}
                  <span
                    className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-medium ${
                      isDone
                        ? "border-foreground bg-foreground text-background"
                        : isActive
                          ? "border-foreground bg-foreground/10 text-foreground"
                          : "border-border text-muted"
                    }`}
                  >
                    {isDone ? "✓" : index + 1}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p
                      className={`text-sm leading-snug ${
                        isActive
                          ? "font-medium text-foreground"
                          : isDone
                            ? "text-muted line-through decoration-border"
                            : "text-muted"
                      }`}
                    >
                      {milestone.title}
                    </p>
                    {isActive && (
                      <p className="mt-1 text-xs tracking-wide text-foreground/70 uppercase">
                        Active
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-auto border-t border-border pt-6">
            <button
              type="button"
              onClick={onSignOut}
              className="w-full rounded-sm border border-border px-3 py-2 text-xs font-medium tracking-wide text-muted transition-colors hover:border-foreground/40 hover:text-foreground"
            >
              Sign Out
            </button>
          </div>
        </aside>

        {/* Column 2 — Strategic Mission */}
        <section className="flex flex-col rounded-sm border border-border bg-foreground/[0.02] p-5 lg:col-span-5 lg:p-6">
          <p className="text-xs font-medium tracking-[0.25em] text-muted uppercase">
            Strategic Mission
          </p>

          <h1 className="mt-4 text-xl font-medium tracking-tight text-foreground sm:text-2xl">
            {activeMilestone.title}
          </h1>

          <div className="mt-6 rounded-sm border border-border bg-foreground/[0.04] p-5">
            <p className="text-xs font-medium tracking-[0.2em] text-muted uppercase">
              Reward &amp; Outcome
            </p>
            <p className="mt-3 text-sm leading-relaxed text-foreground">
              <span className="text-muted">Outcome:</span>{" "}
              {activeMilestone.validationOutcome}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-foreground">
              <span className="text-muted">Expected Revenue:</span> $0
            </p>
          </div>

          <LeanLedger key={projectId ?? "ledger"} techStack={metrics.techStack} />

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-sm border border-border p-4">
              <p className="text-xs text-muted uppercase tracking-wide">
                MVP Baseline
              </p>
              <p className="mt-2 text-lg font-medium tabular-nums text-foreground">
                {formatUsd(metrics.requiredCapital)}
              </p>
              <p className="mt-1 text-xs text-muted">
                From feasibility engine
              </p>
            </div>
            <div className="rounded-sm border border-border p-4">
              <p className="text-xs text-muted uppercase tracking-wide">
                Est. Monthly Burn
              </p>
              <p className="mt-2 text-lg font-medium tabular-nums text-foreground">
                {formatUsd(monthlyBurnEstimate)}
              </p>
              <p className="mt-1 text-xs text-muted">
                Risk: {metrics.riskLevel}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {metrics.techStack.map((tool) => (
              <span
                key={tool}
                className="rounded-sm border border-border px-2.5 py-1 text-xs text-muted"
              >
                {tool}
              </span>
            ))}
          </div>
        </section>

        {/* Column 3 — Daily Grind */}
        <aside className="flex flex-col rounded-sm border border-border bg-foreground/[0.02] p-5 lg:col-span-4 lg:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-[0.25em] text-muted uppercase">
                Daily Grind
              </p>
              <p className="mt-1 text-sm text-muted">Action Hub</p>
            </div>
            <button
              type="button"
              onClick={() => setFocusActive((active) => !active)}
              className={`shrink-0 rounded-sm border px-3 py-2 text-xs font-medium tracking-wide transition-colors ${
                focusActive
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-foreground hover:border-foreground/40"
              }`}
            >
              {focusActive ? "Stop Focus" : "Start Focus"}
            </button>
          </div>

          <div className="mt-6 space-y-6">
            <TaskSection label="THINK">
              <TaskCheckbox
                id={`think-task-${activePhaseIndex}`}
                label={activeMilestone.thinkTask}
                checked={activeMilestone.thinkComplete}
                disabled={false}
                onChange={(checked) =>
                  updateTaskCompletion(activePhaseIndex, "think", checked)
                }
              />
            </TaskSection>

            <TaskSection label="BUILD">
              <TaskCheckbox
                id={`build-task-${activePhaseIndex}`}
                label={activeMilestone.buildTask}
                checked={activeMilestone.buildComplete}
                disabled={!activeMilestone.thinkComplete}
                onChange={(checked) =>
                  updateTaskCompletion(activePhaseIndex, "build", checked)
                }
              />
              {!activeMilestone.thinkComplete && (
                <p className="mt-2 text-xs text-muted">
                  Complete the [THINK] task first to unlock [BUILD].
                </p>
              )}
            </TaskSection>
          </div>
        </aside>
      </div>
    </main>
  );
}

function TaskSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-3 text-xs font-medium tracking-[0.3em] text-muted">
        [{label}]
      </p>
      {children}
    </div>
  );
}

function TaskCheckbox({
  id,
  label,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer items-start gap-3 rounded-sm border border-border p-3 transition-colors ${
        disabled
          ? "cursor-not-allowed opacity-40"
          : "hover:border-foreground/30"
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border-border bg-transparent accent-foreground disabled:cursor-not-allowed"
      />
      <span
        className={`text-sm leading-relaxed transition-opacity ${
          checked
            ? "text-muted line-through decoration-border opacity-60"
            : "text-foreground"
        }`}
      >
        {label}
      </span>
    </label>
  );
}

function MatrixCard({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-sm border border-border bg-foreground/[0.03] p-5 sm:p-6 ${className}`}
    >
      <h2 className="text-xs font-medium tracking-[0.2em] text-muted uppercase">
        {label}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function OnboardingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const startFresh = searchParams.get("new") === "true";
  const [input, setInput] = useState("");
  const [showMatrix, setShowMatrix] = useState(false);
  const [blueprint, setBlueprint] = useState<VentureBlueprint | null>(null);
  const [projectIsActive, setProjectIsActive] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [allProjects, setAllProjects] = useState<ProjectRecord[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [persistError, setPersistError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const blueprintPersistedRef = useRef(false);

  function applyProject(record: ProjectRecord) {
    setBlueprint(blueprintFromRecord(record));
    setProjectId(record.id);
  }

  function handleSelectProject(project: ProjectRecord) {
    applyProject(project);
    setProjectIsActive(true);
    setShowMatrix(false);
    setPersistError(null);
  }

  function handleNewVenture() {
    router.push("/");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
        return;
      }

      setUserId(session.user.id);
      setAuthChecked(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
        return;
      }

      setUserId(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, [router, supabase]);

  function handleBlueprintUpdate(next: VentureBlueprint) {
    setBlueprint(next);

    if (!projectId) {
      return;
    }

    setAllProjects((current) =>
      current.map((project) =>
        project.id === projectId
          ? {
              ...project,
              dynamic_milestones: next.dynamicMilestones,
              doability_score: next.doabilityScore,
              required_capital: next.requiredCapital,
              risk_level: next.riskLevel,
              tech_stack: next.techStack,
            }
          : project,
      ),
    );
  }

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    messages: [INITIAL_UI_MESSAGE],
    onFinish: ({ messages: finishedMessages }) => {
      void persistBlueprintFromMessages(finishedMessages);
    },
  });

  async function persistBlueprintFromMessages(chatMessages: UIMessage[]) {
    if (blueprintPersistedRef.current || isSaving) {
      return;
    }

    const extracted = extractFinalizeBlueprintFromMessages(chatMessages);
    if (!extracted) {
      return;
    }

    blueprintPersistedRef.current = true;
    setIsSaving(true);
    setPersistError(null);

    try {
      if (!userId) {
        return;
      }

      const record = await saveGuestProject(
        extracted,
        deriveProjectTitle(extracted, chatMessages),
        userId,
      );
      const projects = await fetchAllGuestProjects(userId);
      setAllProjects(projects);
      applyProject(record);
      setShowMatrix(true);
    } catch (saveError) {
      blueprintPersistedRef.current = false;
      setBlueprint(extracted);
      setShowMatrix(true);
      setPersistError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save project to Supabase.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCommit() {
    if (projectId && userId) {
      try {
        await activateGuestProject(projectId, userId);
        setAllProjects((current) =>
          current.map((project) =>
            project.id === projectId
              ? { ...project, is_active: true }
              : project,
          ),
        );
        setPersistError(null);
      } catch (commitError) {
        setPersistError(
          commitError instanceof Error
            ? commitError.message
            : "Failed to activate project.",
        );
        return;
      }
    }

    setProjectIsActive(true);
  }

  useEffect(() => {
    if (!authChecked || !userId) {
      return;
    }

    const activeUserId = userId;

    async function hydrateFromSupabase() {
      try {
        const projects = await fetchAllGuestProjects(activeUserId);
        setAllProjects(projects);

        if (startFresh || projects.length === 0) {
          return;
        }

        const latest = projects[0];
        applyProject(latest);
        blueprintPersistedRef.current = true;
        setProjectIsActive(true);
      } catch (loadError) {
        setPersistError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load saved project.",
        );
      } finally {
        setIsHydrating(false);
      }
    }

    void hydrateFromSupabase();
  }, [startFresh, authChecked, userId]);

  const isLoading = status === "submitted" || status === "streaming";
  const chatLocked = showMatrix || projectIsActive || isHydrating;

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => {
    if (isHydrating || showMatrix || projectIsActive) {
      return;
    }

    void persistBlueprintFromMessages(messages);
  }, [messages, isHydrating, showMatrix, projectIsActive]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading || chatLocked) {
      return;
    }

    sendMessage({ text: trimmed });
    setInput("");
  }

  if (!authChecked || isHydrating) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <p className="text-sm text-muted">Loading your venture…</p>
      </main>
    );
  }

  if (projectIsActive && blueprint && userId) {
    return (
      <>
        {persistError && (
          <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-sm border border-red-500/50 bg-background px-4 py-2 text-sm text-red-400">
            {persistError}
          </div>
        )}
        <ActiveProjectDashboard
          blueprint={blueprint}
          projectId={projectId}
          userId={userId}
          allProjects={allProjects}
          onBlueprintUpdate={handleBlueprintUpdate}
          onPersistError={setPersistError}
          onSelectProject={handleSelectProject}
          onNewVenture={handleNewVenture}
          onSignOut={() => void handleSignOut()}
        />
      </>
    );
  }

  if (showMatrix && blueprint) {
    return (
      <main className="flex flex-1 flex-col items-center px-4 py-10 sm:py-16">
        {persistError && (
          <p className="mb-6 max-w-md text-center text-sm text-red-400" role="alert">
            {persistError}
          </p>
        )}
        {isSaving && (
          <p className="mb-6 text-sm text-muted">Saving blueprint to Supabase…</p>
        )}
        <FeasibilityMatrix blueprint={blueprint} onCommit={() => void handleCommit()} />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-8 sm:py-12">
      <div className="flex h-[min(720px,calc(100dvh-4rem))] w-full max-w-2xl flex-col overflow-hidden rounded-sm border border-border">
        <div
          ref={scrollRef}
          className="flex-1 space-y-6 overflow-y-auto px-5 py-8 sm:px-8"
          aria-label="Conversation"
        >
          {messages.map((message) => {
            const text = getMessageText(message);
            const hasBlueprintTool = messageHasFinalizeBlueprintTool(message);

            if (hasBlueprintTool) {
              return (
                <div key={message.id} className="flex justify-start">
                  <div className="max-w-[90%] rounded-sm border border-border bg-foreground/[0.03] px-4 py-3 text-sm leading-relaxed text-foreground sm:max-w-[85%]">
                    <p className="font-medium">Blueprint locked.</p>
                    <p className="mt-2 text-muted">
                      Generating your feasibility matrix…
                    </p>
                  </div>
                </div>
              );
            }

            if (!text.trim()) {
              return null;
            }

            return (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={
                    message.role === "assistant"
                      ? "max-w-[90%] rounded-sm border border-border bg-foreground/[0.03] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-foreground sm:max-w-[85%]"
                      : "max-w-[90%] rounded-sm bg-foreground px-4 py-3 text-sm leading-relaxed text-background sm:max-w-[85%]"
                  }
                >
                  {text}
                </div>
              </div>
            );
          })}

          {isLoading &&
            messages.at(-1)?.role === "user" && (
              <div className="flex justify-start" aria-live="polite">
                <div className="rounded-sm border border-border bg-foreground/[0.03] px-4 py-3 text-sm text-muted">
                  Analyzing…
                </div>
              </div>
            )}

          {error && (
            <p className="text-center text-sm text-red-400" role="alert">
              {error.message}
            </p>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex shrink-0 items-end gap-3 border-t border-border bg-background px-4 py-4 sm:px-5"
        >
          <label htmlFor="onboarding-input" className="sr-only">
            Your response
          </label>
          <input
            id="onboarding-input"
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type your response..."
            autoComplete="off"
            disabled={isLoading || chatLocked}
            className="min-h-11 flex-1 rounded-sm border border-border bg-transparent px-4 text-sm text-foreground placeholder:text-muted outline-none transition-colors focus:border-foreground/50 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || chatLocked}
            className="flex h-11 shrink-0 items-center justify-center rounded-sm bg-foreground px-5 text-sm font-medium tracking-wide text-background transition-opacity enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 flex-col items-center justify-center px-4">
          <p className="text-sm text-muted">Loading your venture…</p>
        </main>
      }
    >
      <OnboardingPageInner />
    </Suspense>
  );
}
