"use client";

import {
  CATEGORY_FIELD_KEY,
  getExtractionFieldByKey,
  getMissingPromptedFields,
  isExtractionComplete,
  PROMPTED_EXTRACTION_FIELDS,
} from "@/lib/ai/gauntlet/scoping-fields";
import { getTaxonomyEntry } from "@/lib/ai/gauntlet/taxonomy";
import type { OnboardingSessionState } from "@/lib/ai/gauntlet/types";
import type { UIMessage } from "ai";

type GauntletDebugPanelProps = {
  state: OnboardingSessionState | null;
  messages?: UIMessage[];
  onDismiss: () => void;
};

type CollectedFieldRow = {
  key: string;
  label: string;
  value: string | null;
  isActive: boolean;
};

function CollectedFieldRow({ row }: { row: CollectedFieldRow }) {
  const captured = Boolean(row.value);
  const isActive = row.isActive && !captured;

  return (
    <li
      className={[
        "rounded-sm border px-2.5 py-2 transition-colors",
        captured
          ? "border-emerald-500/35 bg-emerald-500/[0.06]"
          : isActive
            ? "border-amber-500/50 bg-amber-500/[0.08]"
            : "border-dashed border-border/70 bg-background/40",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={[
            "text-[10px] font-medium tracking-wide uppercase",
            captured
              ? "text-emerald-700 dark:text-emerald-400"
              : isActive
                ? "text-amber-700 dark:text-amber-400"
                : "text-muted",
          ].join(" ")}
        >
          {row.label}
        </p>
        <span
          className={[
            "shrink-0 rounded-sm px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide",
            captured
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : isActive
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                : "bg-foreground/5 text-muted",
          ].join(" ")}
        >
          {captured ? "captured" : isActive ? "asking" : "empty"}
        </span>
      </div>

      {captured ? (
        <p className="mt-1.5 text-[11px] leading-snug break-words text-foreground">
          {row.value}
        </p>
      ) : (
        <p className="mt-1.5 text-[11px] italic text-muted/80">
          {isActive ? "Waiting for this in chat…" : "Not captured yet"}
        </p>
      )}

      <p className="mt-1 font-mono text-[9px] text-muted/70">{row.key}</p>
    </li>
  );
}

export function GauntletDebugPanel({
  state,
  onDismiss,
}: GauntletDebugPanelProps) {
  const rows: CollectedFieldRow[] = [];
  let capturedCount = 0;
  let categoryRow: CollectedFieldRow | null = null;

  if (state) {
    for (const field of PROMPTED_EXTRACTION_FIELDS) {
      const value = state.extractedData[field.key]?.trim() || null;
      if (value) {
        capturedCount += 1;
      }

      rows.push({
        key: field.key,
        label: field.label,
        value,
        isActive: state.activeDataPoint === field.key,
      });
    }

    const categoryValue = state.extractedData[CATEGORY_FIELD_KEY]?.trim() || null;
    if (categoryValue) {
      capturedCount += 1;
    }

    const taxonomy = categoryValue ? getTaxonomyEntry(categoryValue) : undefined;

    categoryRow = {
      key: CATEGORY_FIELD_KEY,
      label: "Business Category",
      value: categoryValue
        ? taxonomy
          ? `${categoryValue}\n${taxonomy.pillarLabel}`
          : categoryValue
        : null,
      isActive: false,
    };
  }

  const totalSlots = PROMPTED_EXTRACTION_FIELDS.length + 1;
  const complete = state ? isExtractionComplete(state.extractedData) : false;
  const missing = state ? getMissingPromptedFields(state.extractedData) : [];
  const activeLabel =
    getExtractionFieldByKey(state?.activeDataPoint ?? "")?.label ??
    (complete ? "Complete" : "—");

  return (
    <aside
      className="hidden h-[min(720px,calc(100dvh-4rem))] w-80 shrink-0 flex-col overflow-hidden rounded-sm border border-dashed border-amber-500/40 bg-amber-500/[0.03] md:flex"
      aria-label="Collected onboarding data"
    >
      <div className="flex items-start justify-between gap-2 border-b border-dashed border-amber-500/30 px-3 py-2.5">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-amber-600 uppercase dark:text-amber-400">
            Collected Info
          </p>
          <p className="mt-0.5 text-[10px] text-muted">
            Live extraction from chat
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-sm px-1.5 py-0.5 text-xs text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
          aria-label="Dismiss collected info panel"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
        <section className="rounded-sm border border-border/60 bg-background/50 px-2.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-medium text-foreground/80">Progress</p>
            <p className="font-mono text-[10px] text-muted">
              {state ? capturedCount : 0}/{totalSlots}
            </p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/10">
            <div
              className="h-full rounded-full bg-emerald-500/70 transition-all duration-300"
              style={{
                width: state
                  ? `${Math.round((capturedCount / totalSlots) * 100)}%`
                  : "0%",
              }}
            />
          </div>
          <p className="mt-2 text-[10px] text-muted">
            <span className="text-foreground/70">Now exploring:</span>{" "}
            {activeLabel}
          </p>
          {state && missing.length > 0 && !complete && (
            <p className="mt-1 text-[10px] leading-snug text-muted">
              <span className="text-foreground/70">Still open:</span>{" "}
              {missing.map((field) => field.label).join(", ")}
            </p>
          )}
          {complete && (
            <p className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400">
              All scoping fields captured
            </p>
          )}
        </section>

        <section>
          <h3 className="text-[10px] font-semibold tracking-[0.2em] text-muted uppercase">
            Scoping Fields
          </h3>
          {!state ? (
            <p className="mt-2 text-xs italic text-muted">No session loaded.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {rows.map((row) => (
                <CollectedFieldRow key={row.key} row={row} />
              ))}
            </ul>
          )}
        </section>

        {categoryRow && (
          <section>
            <h3 className="text-[10px] font-semibold tracking-[0.2em] text-muted uppercase">
              Inferred Category
            </h3>
            <ul className="mt-2">
              <CollectedFieldRow row={categoryRow} />
            </ul>
          </section>
        )}

        {state && (
          <section className="rounded-sm border border-dashed border-border/50 px-2.5 py-2 font-mono text-[9px] text-muted">
            <p>
              <span className="text-foreground/60">session.category:</span>{" "}
              {state.category}
            </p>
            <p className="mt-1">
              <span className="text-foreground/60">activeDataPoint:</span>{" "}
              {state.activeDataPoint || "—"}
            </p>
          </section>
        )}
      </div>
    </aside>
  );
}
