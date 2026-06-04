"use client";

import {
  calculateMonthlyBurn,
  formatMonthlyBurn,
  mapTechStackToLedgerEntries,
  type PremiumExpense,
} from "@/lib/lean-ledger";
import { FormEvent, useMemo, useState } from "react";

type LeanLedgerProps = {
  techStack: string[];
};

export function LeanLedger({ techStack }: LeanLedgerProps) {
  const [premiumExpenses, setPremiumExpenses] = useState<PremiumExpense[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [toolName, setToolName] = useState("");
  const [monthlyCost, setMonthlyCost] = useState("");

  const stackEntries = useMemo(
    () => mapTechStackToLedgerEntries(techStack),
    [techStack],
  );

  const monthlyBurn = calculateMonthlyBurn(premiumExpenses);
  const isZeroBurn = monthlyBurn === 0;

  function handleAddExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = toolName.trim();
    const parsedCost = parseFloat(monthlyCost);

    if (!trimmedName || Number.isNaN(parsedCost) || parsedCost < 0) {
      return;
    }

    setPremiumExpenses((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        toolName: trimmedName,
        monthlyCost: parsedCost,
      },
    ]);

    setToolName("");
    setMonthlyCost("");
    setShowAddForm(false);
  }

  return (
    <div className="mt-6 rounded-sm border border-border bg-foreground/[0.04]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-foreground/[0.06] px-4 py-3 sm:px-5">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] text-muted uppercase">
            Lean Ledger
          </p>
          <p className="mt-1 text-sm tabular-nums text-foreground">
            Monthly Runway Burn:{" "}
            <span className="font-medium">
              {formatMonthlyBurn(monthlyBurn)} / mo
            </span>
          </p>
        </div>
        {isZeroBurn && (
          <span className="inline-flex shrink-0 items-center rounded-sm border border-emerald-400/60 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold tracking-[0.15em] text-emerald-300 uppercase">
            ZERO-BURN VERIFIED
          </span>
        )}
      </div>

      <div className="space-y-2 px-4 py-4 sm:px-5">
        <p className="text-[10px] font-medium tracking-[0.25em] text-muted uppercase">
          Baseline Stack (2026 Free Tiers)
        </p>

        <ul className="space-y-2">
          {stackEntries.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded-sm border border-border/80 bg-foreground/[0.03] px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {entry.toolName}
                </p>
                <p className="text-xs text-muted">{entry.category}</p>
              </div>
              <p className="shrink-0 text-xs tabular-nums text-muted">
                {entry.costLabel}
              </p>
            </li>
          ))}
        </ul>

        {premiumExpenses.length > 0 && (
          <>
            <p className="pt-2 text-[10px] font-medium tracking-[0.25em] text-muted uppercase">
              Premium Costs (Simulated)
            </p>
            <ul className="space-y-2">
              {premiumExpenses.map((expense) => (
                <li
                  key={expense.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-sm border border-amber-500/20 bg-amber-500/[0.04] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {expense.toolName}
                    </p>
                    <p className="text-xs text-muted">Premium / Recurring</p>
                  </div>
                  <p className="shrink-0 text-xs tabular-nums text-amber-200/90">
                    {formatMonthlyBurn(expense.monthlyCost)} / mo
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="border-t border-border px-4 py-3 sm:px-5">
        {showAddForm ? (
          <form onSubmit={handleAddExpense} className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block">
                <span className="sr-only">Tool name</span>
                <input
                  type="text"
                  value={toolName}
                  onChange={(event) => setToolName(event.target.value)}
                  placeholder="Tool name"
                  className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none focus:border-foreground/40"
                />
              </label>
              <label className="block">
                <span className="sr-only">Monthly cost</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={monthlyCost}
                  onChange={(event) => setMonthlyCost(event.target.value)}
                  placeholder="Monthly cost ($)"
                  className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none focus:border-foreground/40"
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-sm bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-90"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setToolName("");
                  setMonthlyCost("");
                }}
                className="rounded-sm border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="text-xs font-medium tracking-wide text-foreground/80 transition-colors hover:text-foreground"
          >
            + Add Premium Cost
          </button>
        )}
      </div>
    </div>
  );
}
