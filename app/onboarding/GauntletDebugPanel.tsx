"use client";

import { tryGetCategoryConfig } from "@/lib/ai/gauntlet/category-registry";
import {
  getBackendGenerationDataPoints,
  getUserAcquisitionDataPoints,
} from "@/lib/ai/gauntlet/data-point-utils";
import type { OnboardingSessionState } from "@/lib/ai/gauntlet/types";

type GauntletDebugPanelProps = {
  state: OnboardingSessionState | null;
  onDismiss: () => void;
};

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

export function GauntletDebugPanel({ state, onDismiss }: GauntletDebugPanelProps) {
  const config = state ? tryGetCategoryConfig(state.category) : null;

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
      className="hidden h-[min(720px,calc(100dvh-4rem))] w-72 shrink-0 flex-col overflow-hidden rounded-sm border border-dashed border-amber-500/40 bg-amber-500/[0.03] md:flex"
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
