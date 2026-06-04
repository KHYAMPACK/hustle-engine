# Product Master Specification: Hustle Engine

## 1. Core Philosophy & Slogan

> **"Teaching you how to think and build—not just giving commands."**

### The Market Gap & Target Audience

The app targets ambitious, early-stage creators, indie builders, and young entrepreneurs sitting at the "Zero-to-One" phase. They have raw ambition but suffer from severe choice paralysis, over-scoping, and a lack of structured business strategy. They often drop projects early due to unexpected costs or technical dead-ends.

### The Boundary Line (What the App Is vs. Is Not)

- **What it IS:** A strategic project manager, business architect, and budget tracker. It guides the user through scoping an idea, choosing a lean infrastructure, mapping out risk, and setting milestones.
- **What it IS NOT:** An IDE, low-code builder, or code generator. It does not write scripts, generate assets, or build the actual product. It forces the user to log into their own tools and do the manual execution themselves, building real founder autonomy.

## 2. Core User Experience & Page Architectures

### View A: The Landing Gate

The entryway to the app is intentionally barren to eliminate distraction. It presents a simple binary choice to keep the user focused:

1. **Initiate a New Venture:** Routes the user directly into the conversational scoping engine.
2. **Resume Active Venture:** Opens a list of currently saved project dashboards.

### View B: The Conversational Blueprint Engine (The Onboarding Chat)

Instead of forcing the user to fill out a cold, intimidating form with twenty questions, the app uses a conversational AI interface that uncovers the project scope via **progressive disclosure**.

- **The Dynamic Interrogation:** The AI begins by asking for a vague, high-level summary of the idea. It analyzes the response and dynamically generates *one question at a time* to narrow down the project type, the user's current skill level, their available time, and their maximum budget.
- **The Cooperative Roadmap Generation:** Once the data is gathered, the AI suggests a series of macro-milestones. The user can talk back to the AI to modify, delete, or add specific tasks to these phases, ensuring they feel ownership over the strategy.
- **The Feasibility Matrix & The "Commit" Gate:** Before a project is saved, the chat transitions into a final, high-contrast review dashboard. This dashboard rates the project on a set of vital matrix scores:
  - *Doability Index:* How realistic is this given the user's current skills?
  - *Required Capital:* What is the absolute baseline cost to launch the MVP?
  - *Skill Gaps:* What concepts will the user need to self-learn during execution?
  - *Risk Horizon:* A color-coded status indicator identifying hidden architectural vulnerabilities (e.g., high database usage risks, platform dependencies).
  - *The Commit Button:* A definitive call-to-action requiring the user to explicitly accept the roadmap and "lock it in" to begin execution.

### View C: The Active Project Tracking Dashboard (3-Column Layout)

Once a project is active, the interface changes completely into a high-momentum workspace split into three distinct columns:

- **Column 1: The Macro Map (The Sidebar)**
  - Displays a global progress percentage tracker for the entire project lifecycle.
  - Shows a vertical timeline of the 4–5 macro-milestones. Completed milestones are checked off, the current milestone is highlighted, and future milestones are blurred out to prevent early-stage overwhelm.
- **Column 2: The Strategic Mission (The Center Panel)**
  - Focuses entirely on the *active milestone*.
  - Displays the expected timeline and financial overhead allocated for this specific phase.
  - Features a prominent "Reward & Outcome Box" that outlines the exact non-financial validation goal of the phase (e.g., *"Outcome: Proving your core game loop works with placeholder assets. Expected Revenue: $0"*).
- **Column 3: The Daily Grind & Action Hub (The Right Panel)**
  - Displays a focused micro-task checklist generated for the active milestone.
  - **Task Categorization:** Tasks are strictly divided into `[THINK]` tasks (mapping out logic loops, researching asset directories, evaluating tool options) and `[BUILD]` tasks (initializing code repositories, importing assets, testing deployments).
  - **The Toolbox Integration:** Clicking any task expands an contextual resource hub providing direct links to recommended free tiers, documentation, asset libraries, or alternative software stacks.
  - **The Focus Timer:** A minimalist focus button that tracks active hours spent building, logging the data directly against the project's time metrics.

### View D: The Lean Ledger (The Financial Tracker)

A dedicated accounting sub-panel designed specifically to help bootstrappers track overhead and protect their runway. It divides all expenses into two stark, clear lists:

1. **One-Time / Fixed Investments:** Tracks non-recurring setup costs such as domain purchases, asset packs, or one-off hardware components.
2. **Monthly Subscriptions / Recurring Costs:** Tracks active software-as-a-service tiers, API usages, or hosting fees. It explicitly calculates and displays a single, high-alert metric: **The Monthly Burn Rate**, keeping the user aware of how much cash is bleeding out while they build.

## 3. Core Behavioral Mechanics & System Loops

### The "Think vs. Build" Balancing Loop

To align with the core slogan, the app structures tasks so the user cannot simply blindly build without understanding the architecture. Completing a `[THINK]` task unlocks the subsequent `[BUILD]` task, teaching the user to design the logical parameters of a system before opening an engine or editor to construct it.

### Gamified Founder Statistics

The app bypasses traditional level-up metrics in favor of tracking a user's real development character traits based on their actions within the dashboard:

- **Strategic Competence:** Earned by resolving `[THINK]` milestones, selecting low-cost architecture alternatives, and mitigating project risks.
- **Execution Endurance:** Earned through verified focus hours logged via the time tracker while checking off `[BUILD]` tasks.

