export type PremiumExpense = {
  id: string;
  toolName: string;
  monthlyCost: number;
};

export type LedgerStackEntry = {
  id: string;
  toolName: string;
  category: string;
  costLabel: string;
};

const STACK_CATALOG: Record<
  string,
  { category: string; costLabel: string }
> = {
  supabase: {
    category: "Database / Auth",
    costLabel: "$0.00 (Free Tier)",
  },
  vercel: {
    category: "Hosting / Deployment",
    costLabel: "$0.00 (Hobby Tier)",
  },
  resend: {
    category: "Email Infrastructure",
    costLabel: "$0.00 (3k / mo free)",
  },
};

function catalogKey(tool: string): string {
  return tool.trim().toLowerCase();
}

export function mapTechStackToLedgerEntries(
  techStack: string[],
): LedgerStackEntry[] {
  return techStack.map((tool) => {
    const mapped = STACK_CATALOG[catalogKey(tool)];

    if (mapped) {
      return {
        id: `stack-${catalogKey(tool)}`,
        toolName: tool,
        category: mapped.category,
        costLabel: mapped.costLabel,
      };
    }

    return {
      id: `stack-${catalogKey(tool)}`,
      toolName: tool,
      category: tool,
      costLabel: "$0.00 (Free Tier Sandbox)",
    };
  });
}

export function calculateMonthlyBurn(
  premiumExpenses: PremiumExpense[],
): number {
  return premiumExpenses.reduce(
    (total, expense) => total + expense.monthlyCost,
    0,
  );
}

export function formatMonthlyBurn(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
