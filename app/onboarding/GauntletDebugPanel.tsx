"use client";

import {
  CATEGORY_FIELD_KEY,
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

export function GauntletDebugPanel({
  state,
  onDismiss,
}: GauntletDebugPanelProps) {
  const scopingFields: { key: string; label: string; value: string }[] = [];
  let categoryLabel: string | null = null;

  if (state) {
    for (const field of PROMPTED_EXTRACTION_FIELDS) {
      const value = state.extractedData[field.key]?.trim();
      if (value) {
        scopingFields.push({
          key: field.key,
          label: field.label,
          value,
        });
      }
    }

    const categoryId = state.extractedData[CATEGORY_FIELD_KEY]?.trim();
    if (categoryId) {
      categoryLabel =
        getTaxonomyEntry(categoryId)?.customerModelLanguage ?? categoryId;
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
            <span className="text-foreground/70">active:</span>{" "}
            {state?.activeDataPoint ?? "—"}
          </p>
          <p className="mt-1">
            <span className="text-foreground/70">category key:</span>{" "}
            {state?.extractedData[CATEGORY_FIELD_KEY]?.trim() || "—"}
          </p>
          {categoryLabel && (
            <p className="mt-1 leading-snug text-foreground/80">{categoryLabel}</p>
          )}
        </section>

        <DebugFieldList
          title="Extracted Scoping"
          subtitle="Project Type → Skill Level → Available Time → Budget"
          fields={scopingFields}
        />
      </div>
    </aside>
  );
}
