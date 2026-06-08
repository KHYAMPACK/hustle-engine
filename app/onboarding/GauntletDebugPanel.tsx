"use client";

import { tryGetCategoryConfig } from "@/lib/ai/gauntlet/category-registry";
import {
  buildExperientialResolverContext,
  EXPERIENTIAL_ARCHETYPE_TIE_BREAK_ORDER,
  getExperientialArchetypeDebugReport,
} from "@/lib/ai/gauntlet/categories/experiential-contextual-examples";
import {
  getBackendGenerationDataPoints,
  getUserAcquisitionDataPoints,
} from "@/lib/ai/gauntlet/data-point-utils";
import type {
  ContextualExampleHistoryEntry,
  OnboardingSessionState,
} from "@/lib/ai/gauntlet/types";
import { getMessageText } from "@/lib/chat-utils";
import type { UIMessage } from "ai";

type GauntletDebugPanelProps = {
  state: OnboardingSessionState | null;
  messages?: UIMessage[];
  onDismiss: () => void;
};

const EXPERIENTIAL_CATEGORY_ID = "1.1C_experiential_software";

const ARCHETYPE_LABELS: Record<string, string> = {
  spatial_3d_immersive: "3D / spatial",
  network_multiplayer_lobby: "Multiplayer",
  system_simulation_management: "Sim / management",
  audio_temporal_sequencer: "Audio / sequencer",
  creative_authoring_canvas: "Creative canvas",
  node_matrix_logic_tool: "Logic / matrix",
  narrative_text_matrix: "Narrative / text",
  realtime_reactive_toy: "Reactive / arcade",
  default: "Default fallback",
};

function buildConversationHistory(messages: UIMessage[]): ContextualExampleHistoryEntry[] {
  return messages
    .map((message) => {
      const text = getMessageText(message).trim();
      if (!text) {
        return null;
      }
      return {
        role: message.role,
        text,
      };
    })
    .filter((entry): entry is ContextualExampleHistoryEntry => entry !== null);
}

function DebugFieldList({
  title,
  subtitle,
  fields,
}: {
  title: string;
  subtitle: string;
  fields: { key: string; label: string; value: string }[];
}) {
  return (
    <section>
      <h3 className="text-[10px] font-semibold tracking-[0.2em] text-muted uppercase">
        {title}
      </h3>
      <p className="mt-0.5 text-[10px] text-muted/80">{subtitle}</p>
      {fields.length === 0 ? (
        <p className="mt-2 text-xs text-muted italic">Nothing captured yet.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {fields.map((field) => (
            <li
              key={field.key}
              className="rounded-sm border border-dashed border-amber-500/30 bg-amber-500/[0.04] px-2.5 py-2"
            >
              <p className="text-[10px] font-medium tracking-wide text-amber-600/90 uppercase dark:text-amber-400/90">
                {field.label}
              </p>
              <p className="mt-1 font-mono text-[11px] leading-snug break-words text-foreground">
                {field.value}
              </p>
              <p className="mt-1 font-mono text-[9px] text-muted">{field.key}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ArchetypeScorePanel({
  state,
  messages,
}: {
  state: OnboardingSessionState;
  messages: UIMessage[];
}) {
  const history = buildConversationHistory(messages);
  const context = buildExperientialResolverContext(state.extractedData, history);
  const report = getExperientialArchetypeDebugReport(context);
  const maxForBar = Math.max(report.maxScore, 1);

  return (
    <section>
      <h3 className="text-[10px] font-semibold tracking-[0.2em] text-muted uppercase">
        Archetype Scores
      </h3>
      <p className="mt-0.5 text-[10px] text-muted/80">
        Regex hit frequency on inferred inspiration text
      </p>

      <div className="mt-2 rounded-sm border border-dashed border-violet-500/35 bg-violet-500/[0.04] px-2.5 py-2">
        <p className="text-[10px] text-muted">
          <span className="text-foreground/70">Winner:</span>{" "}
          <span className="font-mono text-violet-600 dark:text-violet-400">
            {report.winner}
          </span>
          {report.tiedAtMax.length > 1 && (
            <span className="ml-1 text-amber-600 dark:text-amber-400">
              (tie → complexity break)
            </span>
          )}
        </p>
        <p className="mt-1 text-[10px] text-muted">
          <span className="text-foreground/70">max hits:</span> {report.maxScore}
        </p>
        {report.inferredText ? (
          <p className="mt-2 font-mono text-[10px] leading-snug break-words text-foreground/90">
            &quot;{report.inferredText.slice(0, 160)}
            {report.inferredText.length > 160 ? "…" : ""}&quot;
          </p>
        ) : (
          <p className="mt-2 text-[10px] italic text-muted">
            No inspiration text yet — scores stay at 0 until pitch or Q1 locks.
          </p>
        )}
      </div>

      <ul className="mt-2 space-y-1.5">
        {EXPERIENTIAL_ARCHETYPE_TIE_BREAK_ORDER.map((archetype) => {
          const score = report.scores[archetype];
          const isWinner =
            report.winner === archetype ||
            (report.winner !== "default" && report.tiedAtMax.includes(archetype));
          const widthPercent = (score / maxForBar) * 100;

          return (
            <li
              key={archetype}
              className={`rounded-sm px-2 py-1.5 ${
                isWinner && score > 0
                  ? "border border-violet-500/40 bg-violet-500/[0.08]"
                  : "border border-transparent"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className="truncate font-mono text-[9px] text-foreground/80"
                  title={archetype}
                >
                  {ARCHETYPE_LABELS[archetype] ?? archetype}
                </span>
                <span
                  className={`shrink-0 font-mono text-[10px] tabular-nums ${
                    isWinner && score > 0
                      ? "font-semibold text-violet-600 dark:text-violet-400"
                      : "text-muted"
                  }`}
                >
                  {score}
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-foreground/10">
                <div
                  className={`h-full rounded-full transition-all ${
                    isWinner && score > 0 ? "bg-violet-500" : "bg-foreground/25"
                  }`}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {report.tiedAtMax.length > 1 && (
        <p className="mt-2 font-mono text-[9px] leading-snug text-muted">
          Tie at {report.maxScore}: {report.tiedAtMax.join(" · ")}
        </p>
      )}
    </section>
  );
}

export function GauntletDebugPanel({
  state,
  messages = [],
  onDismiss,
}: GauntletDebugPanelProps) {
  const config = state ? tryGetCategoryConfig(state.category) : null;
  const showArchetypeScores = state?.category === EXPERIENTIAL_CATEGORY_ID;

  const populatedUserFields: { key: string; label: string; value: string }[] = [];
  const populatedBackendFields: { key: string; label: string; value: string }[] = [];
  const otherFields: { key: string; label: string; value: string }[] = [];

  if (state && config) {
    const knownKeys = new Set(config.dataPoints.map((point) => point.key));

    for (const point of getUserAcquisitionDataPoints(config)) {
      const value = state.extractedData[point.key]?.trim();
      if (value) {
        populatedUserFields.push({
          key: point.key,
          label: point.streetSmartLabel,
          value,
        });
      }
    }

    for (const point of getBackendGenerationDataPoints(config)) {
      const value = state.extractedData[point.key]?.trim();
      if (value) {
        populatedBackendFields.push({
          key: point.key,
          label: point.streetSmartLabel,
          value,
        });
      }
    }

    for (const [key, raw] of Object.entries(state.extractedData)) {
      const value = raw?.trim();
      if (!value || knownKeys.has(key)) {
        continue;
      }
      otherFields.push({ key, label: key, value });
    }
  } else if (state) {
    for (const [key, raw] of Object.entries(state.extractedData)) {
      const value = raw?.trim();
      if (value) {
        otherFields.push({ key, label: key, value });
      }
    }
  }

  return (
    <aside
      className="hidden h-[min(720px,calc(100dvh-4rem))] w-80 shrink-0 flex-col overflow-hidden rounded-sm border border-dashed border-amber-500/40 bg-amber-500/[0.03] md:flex"
      aria-label="Gauntlet debug panel (testing only)"
    >
      <div className="flex items-start justify-between gap-2 border-b border-dashed border-amber-500/30 px-3 py-2.5">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-amber-600 uppercase dark:text-amber-400">
            Debug Panel
          </p>
          <p className="mt-0.5 text-[10px] text-muted">Testing only — delete file to remove</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-sm px-1.5 py-0.5 text-xs text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
          aria-label="Dismiss debug panel"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
        <section className="rounded-sm border border-border/60 bg-background/50 px-2.5 py-2 font-mono text-[10px] text-muted">
          <p>
            <span className="text-foreground/70">category:</span>{" "}
            {state?.category ?? "—"}
          </p>
          <p className="mt-1">
            <span className="text-foreground/70">active:</span>{" "}
            {state?.activeDataPoint ?? "—"}
          </p>
          <p className="mt-1">
            <span className="text-foreground/70">stage:</span>{" "}
            {state?.currentStage ?? "—"}
          </p>
          <p className="mt-1">
            <span className="text-foreground/70">escalation:</span>{" "}
            {state?.escalationAttempt ?? "—"}
          </p>
        </section>

        {showArchetypeScores && state && (
          <ArchetypeScorePanel state={state} messages={messages} />
        )}

        <DebugFieldList
          title="Section 1 · User"
          subtitle="Chat-facing answers"
          fields={populatedUserFields}
        />

        <DebugFieldList
          title="Section 2 · Backend"
          subtitle="AI-derived milestone params"
          fields={populatedBackendFields}
        />

        {otherFields.length > 0 && (
          <DebugFieldList
            title="Other"
            subtitle="Unmapped or pre-triage keys"
            fields={otherFields}
          />
        )}
      </div>
    </aside>
  );
}
