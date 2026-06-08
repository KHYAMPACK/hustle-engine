  import { experientialContextualExamples } from "@/lib/ai/gauntlet/categories/experiential-contextual-examples";
  import { normalizeCategoryConfig } from "@/lib/ai/gauntlet/data-point-utils";
  import type { DataPointDefinitionInput } from "@/lib/ai/gauntlet/data-point-utils";
  import type { CategoryTrackConfig, DataPointDefinition } from "@/lib/ai/gauntlet/types";
  import { getCustomerModelLanguage } from "@/lib/ai/gauntlet/taxonomy";

  const EXPERIENTIAL_SOFTWARE_STAGE_MASKS = [
    { stage: 1 as const, customerLanguage: "The creative core" },
    { stage: 2 as const, customerLanguage: "Visual & platform shape" },
    { stage: 3 as const, customerLanguage: "Production pipeline" },
    { stage: 4 as const, customerLanguage: "Technical blueprint" },
    { stage: 5 as const, customerLanguage: "Build guardrails" },
  ] as const;

  const cx = experientialContextualExamples;

  export const EXPERIENTIAL_SOFTWARE_DATA_POINTS: readonly DataPointDefinitionInput[] = [
    // ── Section 1: User acquisition (chat-facing) ──────────────────────────────
    {
      key: "inspiration_baseline",
      stage: 1,
      isFoundation: true,
      generationMode: "user_input",
      section: "user_acquisition",
      isMultipleChoice: false,
      streetSmartLabel: "The Inspiration Baseline",
      targetIntent:
        "Capture the specific existing game, app, or interactive experience that anchors their creative direction — the reference point they are riffing on or reacting against.",
      referenceBaseline:
        "What existing game, app, or interactive experience is the closest inspiration for what you want to build?",
      analystCriteria:
        "A named reference product or clearly described interactive experience — not 'something like Minecraft' without saying what mechanic they are stealing.",
      guardrailFocus:
        "One named reference title — not 'inspired by everything'.",
      contextualExample: cx.inspiration_baseline,
    },
    {
      key: "core_interactive_verb",
      stage: 1,
      isFoundation: true,
      generationMode: "ai_predict",
      section: "user_acquisition",
      isMultipleChoice: false,
      streetSmartLabel: "The Core Interactive Verb",
      targetIntent:
        "Isolate the single primary action the player or user repeats — the verb that defines the core loop (tap, drag, shoot, explore, solve, build).",
      referenceBaseline:
        "If you had to describe the one thing the user keeps doing over and over, what is that core action?",
      analystCriteria:
        "One repeatable verb or interaction pattern — not a feature list or story premise.",
      guardrailFocus:
        "One verb that fires every few seconds — not a story arc or feature list.",
      contextualExample: cx.core_interactive_verb,
    },
    {
      key: "hook_payload",
      stage: 1,
      isFoundation: true,
      generationMode: "ai_predict",
      section: "user_acquisition",
      isMultipleChoice: false,
      streetSmartLabel: "The 'Hook' or Payload",
      targetIntent:
        "Extract the immediate payoff or payload delivered within the first interaction — the reason someone keeps playing past the first 10 seconds.",
      referenceBaseline:
        "What is the instant payoff or 'wow moment' someone gets in the first few seconds of playing?",
      analystCriteria:
        "A concrete first-session reward or sensation — score spike, discovery, challenge beat, not a long-term vision.",
      guardrailFocus:
        "A payoff visible in the first 10 seconds — not a tutorial-gated reward.",
      contextualExample: cx.hook_payload,
    },
    {
      key: "visual_dimension",
      stage: 2,
      isFoundation: false,
      generationMode: "ai_predict",
      section: "user_acquisition",
      isMultipleChoice: true,
      allowedValues: ["2D Flat", "3D Space"],
      streetSmartLabel: "The Visual Dimension",
      targetIntent:
        "Lock whether the experience renders on a flat 2D plane or in a 3D spatial environment — this drives engine, art pipeline, and performance constraints.",
      referenceBaseline:
        "Is this a flat 2D experience or does it live in 3D space?",
      analystCriteria:
        "Must resolve to exactly one of: 2D Flat or 3D Space.",
      guardrailFocus:
        "Pick 2D or 3D explicitly — solo 3D first builds burn months.",
      contextualExample: cx.visual_dimension,
    },
    {
      key: "target_screen",
      stage: 2,
      isFoundation: false,
      generationMode: "user_input",
      section: "user_acquisition",
      isMultipleChoice: true,
      allowedValues: ["Web Browser", "Mobile App", "Desktop Software"],
      streetSmartLabel: "The Target Screen",
      targetIntent:
        "Identify the primary distribution surface — browser, mobile, or desktop — to constrain input methods, build tooling, and export targets.",
      referenceBaseline:
        "Where do people actually play or use this — in a web browser, on a phone, or as desktop software?",
      analystCriteria:
        "Must resolve to exactly one of: Web Browser, Mobile App, or Desktop Software.",
      guardrailFocus:
        "One primary screen — not day-one multi-platform.",
      contextualExample: cx.target_screen,
    },
    {
      key: "art_pipeline",
      stage: 3,
      isFoundation: false,
      generationMode: "user_input",
      section: "user_acquisition",
      isMultipleChoice: true,
      allowedValues: [
        "Draw/model myself",
        "Pre-made asset packs",
        "AI generation tools",
        "Basic shapes and text",
      ],
      streetSmartLabel: "The Art Pipeline",
      targetIntent:
        "Map how visual assets will actually be produced — self-authored art, purchased packs, AI-generated sprites, or placeholder primitives.",
      referenceBaseline:
        "How are you going to get the visuals — drawing yourself, buying asset packs, using AI tools, or starting with basic shapes?",
      analystCriteria:
        "Must resolve to exactly one of the four allowed art pipeline options.",
      guardrailFocus:
        "Match art pipeline to skill and hours — custom art with zero budget kills solo game builds.",
      contextualExample: cx.art_pipeline,
    },

    // ── Section 2: Backend generation (derived milestone intelligence) ─────────
    {
      key: "core_technical_engine",
      stage: 4,
      isFoundation: false,
      generationMode: "ai_predict",
      section: "backend_generation",
      streetSmartLabel: "Core technical engine",
      targetIntent:
        "Derive the specific runtime engine or framework recommendation (e.g., Phaser, Godot, Unity, Three.js, React Canvas) based on visual dimension, target screen, and core interactive verb.",
      referenceBaseline:
        "Internal: auto-select the leanest engine that supports the locked visual dimension and target screen.",
      analystCriteria:
        "One named engine or framework with a one-line justification tied to Section 1 answers.",
      guardrailFocus:
        "Smallest engine that ships the locked loop — not the most impressive stack.",
      contextualExample: cx.core_technical_engine,
    },
    {
      key: "input_tracking_blueprint",
      stage: 4,
      isFoundation: false,
      generationMode: "ai_predict",
      section: "backend_generation",
      streetSmartLabel: "Input tracking blueprint",
      targetIntent:
        "Define the exact input events and bindings required for the core interactive verb on the target screen (touch taps, keyboard WASD, mouse drag, etc.).",
      referenceBaseline:
        "Internal: map the core verb to concrete input handlers for the chosen platform.",
      analystCriteria:
        "Named input methods and event bindings — not generic 'user input'.",
      guardrailFocus:
        "Only inputs the MVP loop needs — defer gamepad and gesture libraries.",
      contextualExample: cx.input_tracking_blueprint,
    },
    {
      key: "game_loop_architecture",
      stage: 4,
      isFoundation: false,
      generationMode: "ai_predict",
      section: "backend_generation",
      streetSmartLabel: "Game loop architecture",
      targetIntent:
        "Specify the update/render cycle structure, state machine phases, and tick order that implements the core interactive verb and hook payload.",
      referenceBaseline:
        "Internal: describe init → play → feedback → reset cycle in implementation terms.",
      analystCriteria:
        "Concrete loop phases with transitions — not abstract 'game feel' language.",
      guardrailFocus:
        "Under five loop states — each extra state is a week of debugging.",
      contextualExample: cx.game_loop_architecture,
    },
    {
      key: "live_variables_list",
      stage: 4,
      isFoundation: false,
      generationMode: "ai_predict",
      section: "backend_generation",
      streetSmartLabel: "Live variables list",
      targetIntent:
        "Enumerate the runtime variables the engine must track every frame or session (score, position, health, timer, inventory slots) derived from the hook and core verb.",
      referenceBaseline:
        "Internal: list named variables with types and what triggers changes.",
      analystCriteria:
        "Named variables with purpose — not 'game state object'.",
      guardrailFocus:
        "Variables for the first playable only — defer meta-progression.",
      contextualExample: cx.live_variables_list,
    },
    {
      key: "long_term_save_strategy",
      stage: 5,
      isFoundation: false,
      generationMode: "ai_predict",
      section: "backend_generation",
      streetSmartLabel: "Long-term save strategy",
      targetIntent:
        "Recommend persistence approach for the MVP — localStorage, IndexedDB, platform cloud save, or session-only — based on target screen and hook payload.",
      referenceBaseline:
        "Internal: pick the lightest save mechanism that preserves the hook across sessions.",
      analystCriteria:
        "One persistence strategy with storage keys or schema sketch.",
      guardrailFocus:
        "Session-only is valid for MVP — cloud save is Phase 2.",
      contextualExample: cx.long_term_save_strategy,
    },
    {
      key: "primitive_shape_substitution",
      stage: 5,
      isFoundation: false,
      generationMode: "ai_predict",
      section: "backend_generation",
      streetSmartLabel: "Primitive shape substitution",
      targetIntent:
        "Define how each visual element maps to placeholder primitives (rectangles, circles, colored blocks) when art pipeline is not self-drawn, per art pipeline choice.",
      referenceBaseline:
        "Internal: map each on-screen entity to a primitive stand-in for greybox phase.",
      analystCriteria:
        "Entity-to-primitive mapping — specific shapes/colors per game object.",
      guardrailFocus:
        "Greybox every entity before swapping in final art.",
      contextualExample: cx.primitive_shape_substitution,
    },
    {
      key: "fatal_coding_mistake",
      stage: 5,
      isFoundation: false,
      generationMode: "ai_predict",
      section: "backend_generation",
      streetSmartLabel: "Fatal coding mistake",
      targetIntent:
        "Identify the single highest-probability technical trap for this exact project profile (wrong engine, premature networking, unbounded entity spawning, etc.).",
      referenceBaseline:
        "Internal: one specific mistake that kills solo experiential builds matching this profile.",
      analystCriteria:
        "One named anti-pattern with why it applies to their Section 1 answers.",
      guardrailFocus:
        "One project-specific landmine — not generic coding advice.",
      contextualExample: cx.fatal_coding_mistake,
    },
  ];

  export const experientialSoftwareCategoryConfig: CategoryTrackConfig =
    normalizeCategoryConfig({
      id: "1.1C_experiential_software",
      customerModelLanguage: getCustomerModelLanguage("1.1C_experiential_software"),
      triageAliases: [
        "experiential_software",
        "interactive_software",
        "mobile_game",
        "video_game",
        "simulation",
        "game",
        "vr_experience",
      ],
      stages: EXPERIENTIAL_SOFTWARE_STAGE_MASKS,
      dataPoints: EXPERIENTIAL_SOFTWARE_DATA_POINTS,
    });

  /** Normalized data points — includes defaulted section and isMultipleChoice flags. */
  export const EXPERIENTIAL_SOFTWARE_DATA_POINTS_NORMALIZED: readonly DataPointDefinition[] =
    experientialSoftwareCategoryConfig.dataPoints;

  /** All evaluation keys for Category 1.1C — used when initializing extractedData JSONB. */
  export const EXPERIENTIAL_SOFTWARE_EVALUATION_KEYS =
    EXPERIENTIAL_SOFTWARE_DATA_POINTS.map((point) => point.key);
