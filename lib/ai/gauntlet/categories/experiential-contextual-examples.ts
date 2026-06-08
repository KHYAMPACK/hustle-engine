import type { ContextualExampleResolverContext } from "@/lib/ai/gauntlet/types";

export type ExperientialArchetype =
  | "system_simulation_management" // Base builders, dashboard visualizers, network topologies, complex sandboxes
  | "realtime_reactive_toy"        // Action games, interactive audio widgets, generative art canvases, clickers
  | "spatial_3d_immersive"         // 3D environments, product configurators, virtual walkthroughs, simulation flight decks
  | "node_matrix_logic_tool"       // Node editors, puzzle matrices, workflow builders, turn-based systems
  | "creative_authoring_canvas"    // Pixel art apps, layout editors, vector manipulation tools, interactive portfolios
  | "narrative_text_matrix"        // AI Chatbots, interactive fiction, word games, step-wizards, high-density logs
  | "audio_temporal_sequencer"     // DAWs, drum machines, launchpads, audio synthesis loops, timeline animation
  | "network_multiplayer_lobby"    // Real-time cooperative spaces, multi-agent rooms, live trading/chat arenas
  | "default";

// ── Regex Pattern Matching Engines ───────────────────────────────────────────
const SYSTEM_SIMULATION_MANAGEMENT_PATTERN =
  /\b(rimworld|oxygen not included|oni|colony|survival sim|dwarf fortress|banished|factorio|city builder|management sim|base builder|resource management|dashboard|topology|analytics pipeline|fleet tracker|ecosystem sim|digital toybox|physics sandbox|virtual pet|habit tracker|biofeedback)\b/i;

const REALTIME_REACTIVE_TOY_PATTERN =
  /\b(flappy bird|arcade|platformer|side.?scroll|runner|endless runner|jump|tap game|bullet hell|roguelite|audio visualizer|canvas toy|physics toy|generative art|particle playground|clicker|tamagotchi|ar filter|ar lens|ambient soundscape|white noise|breathing exercise|typing tutor)\b/i;

const SPATIAL_3D_IMMERSIVE_PATTERN =
  /\b(3d sim|flight sim|open world|unity|unreal|vr|virtual reality|spatial|sandbox 3d|ksp|kerbal|product configurator|digital twin|3d viewer|walkthrough|three\.js|spline|babylon|metaverse|cad|planetarium|space exploration|museum tour|interactive gallery|anatomy viewer|biology viewer|historical recreation|driving sim|scenic exploration|walking sim|mindfulness vr)\b/i;

const NODE_MATRIX_LOGIC_TOOL_PATTERN =
  /\b(puzzle|match.?3|chess|turn.?based|strategy|tactics|sokoban|portal|logic game|node editor|flowchart|node-based|automation wizard|circuit engineer|shader graph|coding game|logic puzzle|escape room|tabletop simulator)\b/i;

const CREATIVE_AUTHORING_CANVAS_PATTERN =
  /\b(figma|photoshop|canva|pixel art|drawing app|vector|canvas editor|portfolio builder|vnode|layout generator|interactive slide|sculpting|3d world builder|scrapbooking|mood-board|landscape generator|choreography|dance design|fashion|avatar custom)\b/i;

const NARRATIVE_TEXT_MATRIX_PATTERN =
  /\b(wordle|sudoku|connections|rpg text|interactive fiction|chatbot|ai companion|character\.ai|wizard|form-based|quiz|flashcard|log viewer|terminal sim|choice-based|storytelling|comic creation|infographic|data visualization|language learning|journaling|reflection)\b/i;

const AUDIO_TEMPORAL_SEQUENCER_PATTERN =
  /\b(sequencer|synth|drum machine|daw|launchpad|midi|piano roll|audio synth|timeline editor|animation tracker|metronome|tempo|music production|virtual dj)\b/i;

const NETWORK_MULTIPLAYER_LOBBY_PATTERN =
  /\b(multiplayer|co-op|mmo|agar\.io|realtime chat|shared whiteboard|collaborative|turn-based net|socket|webrtc|p2p|lobby|matchmaking|live streaming|overlay|social hub|watch-party|virtual office|co-working|spatial chat|concert|live event|trivia|party game|virtual community)\b/i;

type ScorableExperientialArchetype = Exclude<ExperientialArchetype, "default">;

const ARCHETYPE_PATTERN_MATRIX: Readonly<
  Record<ScorableExperientialArchetype, RegExp>
> = {
  system_simulation_management: SYSTEM_SIMULATION_MANAGEMENT_PATTERN,
  realtime_reactive_toy: REALTIME_REACTIVE_TOY_PATTERN,
  spatial_3d_immersive: SPATIAL_3D_IMMERSIVE_PATTERN,
  node_matrix_logic_tool: NODE_MATRIX_LOGIC_TOOL_PATTERN,
  creative_authoring_canvas: CREATIVE_AUTHORING_CANVAS_PATTERN,
  narrative_text_matrix: NARRATIVE_TEXT_MATRIX_PATTERN,
  audio_temporal_sequencer: AUDIO_TEMPORAL_SEQUENCER_PATTERN,
  network_multiplayer_lobby: NETWORK_MULTIPLAYER_LOBBY_PATTERN,
};

/** Highest complexity wins ties — preserves 3d > colony/sim > puzzle > arcade relative order. */
const ARCHETYPE_TIE_BREAK_PRIORITY: readonly ScorableExperientialArchetype[] = [
  "spatial_3d_immersive",
  "network_multiplayer_lobby",
  "system_simulation_management",
  "audio_temporal_sequencer",
  "creative_authoring_canvas",
  "node_matrix_logic_tool",
  "narrative_text_matrix",
  "realtime_reactive_toy",
];

function toGlobalPattern(pattern: RegExp): RegExp {
  if (pattern.global) {
    return pattern;
  }

  const flags = pattern.flags.includes("i") ? "gi" : "g";
  return new RegExp(pattern.source, flags);
}

function countPatternHits(text: string, pattern: RegExp): number {
  const matcher = toGlobalPattern(pattern);
  
  const matches = text.match(matcher);
  return matches ? matches.length : 0;
}

function scoreArchetypeHits(text: string): Record<ScorableExperientialArchetype, number> {
  const scores = {} as Record<ScorableExperientialArchetype, number>;

  for (const archetype of ARCHETYPE_TIE_BREAK_PRIORITY) {
    scores[archetype] = countPatternHits(text, ARCHETYPE_PATTERN_MATRIX[archetype]);
  }

  return scores;
}

function resolveHighestScoringArchetype(
  scores: Record<ScorableExperientialArchetype, number>,
): ScorableExperientialArchetype | "default" {
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) {
    return "default";
  }

  const tiedArchetypes = ARCHETYPE_TIE_BREAK_PRIORITY.filter(
    (archetype) => scores[archetype] === maxScore,
  );

  if (tiedArchetypes.length === 1) {
    return tiedArchetypes[0];
  }

  return tiedArchetypes[0];
}

// ── Context Extraction Helpers ───────────────────────────────────────────────
function inferInspirationText(context: ContextualExampleResolverContext): string {
  const locked = context.inspirationBaseline?.trim();
  if (locked) return locked;

  const fromExtracted = context.extractedData.inspiration_baseline?.trim();
  if (fromExtracted) return fromExtracted;

  const userTurns = context.history
    .filter((entry) => entry.role === "user")
    .map((entry) => entry.text)
    .join(" ");

  return userTurns.trim();
}

export function detectExperientialArchetype(
  context: ContextualExampleResolverContext,
): ExperientialArchetype {
  const text = inferInspirationText(context);
  if (!text) {
    return "default";
  }

  const scores = scoreArchetypeHits(text);
  return resolveHighestScoringArchetype(scores);
}

export type ExperientialArchetypeDebugReport = {
  inferredText: string;
  winner: ExperientialArchetype;
  maxScore: number;
  scores: Record<ScorableExperientialArchetype, number>;
  tiedAtMax: ScorableExperientialArchetype[];
};

function emptyArchetypeScores(): Record<ScorableExperientialArchetype, number> {
  return ARCHETYPE_TIE_BREAK_PRIORITY.reduce(
    (scores, archetype) => {
      scores[archetype] = 0;
      return scores;
    },
    {} as Record<ScorableExperientialArchetype, number>,
  );
}

export function buildExperientialResolverContext(
  extractedData: ContextualExampleResolverContext["extractedData"],
  history: ContextualExampleResolverContext["history"] = [],
): ContextualExampleResolverContext {
  const inspirationBaseline =
    extractedData.inspiration_baseline?.trim() || undefined;

  return {
    extractedData,
    inspirationBaseline,
    history,
  };
}

export function getExperientialArchetypeDebugReport(
  context: ContextualExampleResolverContext,
): ExperientialArchetypeDebugReport {
  const inferredText = inferInspirationText(context);
  if (!inferredText) {
    return {
      inferredText: "",
      winner: "default",
      maxScore: 0,
      scores: emptyArchetypeScores(),
      tiedAtMax: [],
    };
  }

  const scores = scoreArchetypeHits(inferredText);
  const maxScore = Math.max(...Object.values(scores));
  const winner = resolveHighestScoringArchetype(scores);
  const tiedAtMax =
    maxScore > 0
      ? ARCHETYPE_TIE_BREAK_PRIORITY.filter((archetype) => scores[archetype] === maxScore)
      : [];

  return {
    inferredText,
    winner,
    maxScore,
    scores,
    tiedAtMax,
  };
}

/** Tie-break order used when scores are equal — highest complexity first. */
export const EXPERIENTIAL_ARCHETYPE_TIE_BREAK_ORDER = ARCHETYPE_TIE_BREAK_PRIORITY;

type ExampleMap = Record<ExperientialArchetype, string>;

// ── Section 1 Mapping: User Acquisition (Chat-Facing) ───────────────────────
const INSPIRATION_EXAMPLES: ExampleMap = {
  system_simulation_management: "RimWorld / Tamagotchi — managing underlying structural state systems, resource arrays, or evolving behavior loops via reactive UI dash elements.",
  realtime_reactive_toy: "Flappy Bird / Beat Saber / TikTok AR Filters — immediate high-frequency frame ticks responding dynamically to user screen coordinates or input triggers.",
  spatial_3d_immersive: "Google Earth VR / Sketchfab — dynamic translation through deep coordinate domains with perspective camera matrices and spatial depth cues.",
  node_matrix_logic_tool: "Blender Shader Graph / Tabletop Simulator / Myst — sequential, stateful evaluation of spatial or node-linked logic structures and state matrices.",
  creative_authoring_canvas: "Figma / Tilt Brush / Spore Creature Creator — freeform geometric or pixel modifications over an isolated coordinate system with deep history arrays.",
  narrative_text_matrix: "Wordle / AI Dungeon / Duolingo — rule-governed alphanumeric string variations parsed and rendered sequentially inside dynamic typographic structural blocks.",
  audio_temporal_sequencer: "Splice Beatmaker / Ableton Live / VirtualDJ — matrix-locked step triggers mapping custom binary vectors over strict clock intervals and tracking playheads.",
  network_multiplayer_lobby: "Agar.io / VRChat / Figma Jam — absolute coordinate synchronization across concurrent localized network sockets via centralized low-latency bridges.",
  default: "Name one existing game, interactive application, or creative tool closest to your idea",
};

const VERB_EXAMPLES: ExampleMap = {
  system_simulation_management: "Dragging a threshold slider to reallocate core system processing parameters or ticking a behavior item to feed a virtual resource.",
  realtime_reactive_toy: "Moving your face rapidly to shift an AR lens filter boundary or clicking a target to burst real-time canvas particles.",
  spatial_3d_immersive: "Holding right-click to orbit a perspective matrix camera smoothly around an interactive mesh anatomy asset.",
  node_matrix_logic_tool: "Dragging a functional logic output link into an open node port input or flipping a turn-based board structural state.",
  creative_authoring_canvas: "Using a pointer layout brush to extrude structural landscape primitives or drawing vector lines onto an editing mask layers system.",
  narrative_text_matrix: "Submitting an alphanumeric character array into a text validator or selecting a story path navigation option block.",
  audio_temporal_sequencer: "Toggling a matrix grid cell to register an audio sample loop buffer trigger or scrubbing a playhead deck coordinate.",
  network_multiplayer_lobby: "Pinging a shared canvas viewport coordinate or casting an input packet stream to instantly adjust your peer position map.",
  default: "One primary, repeatable interactive action the user takes every few seconds",
};

const HOOK_EXAMPLES: ExampleMap = {
  system_simulation_management: "Dynamic system status badges immediately re-render values and an anomaly alert tracking bar flashes neon alerts.",
  realtime_reactive_toy: "A continuous cascade of procedural vector particles bursts instantly out from the interactive coordinate index tracking.",
  spatial_3d_immersive: "The atmospheric lighting matrix shifts dynamically as the camera sweeps through a 3D structural sky dome wrapper array.",
  node_matrix_logic_tool: "A complete matrix execution pipeline paths into an active green flow visual immediately upon a connection snap event.",
  creative_authoring_canvas: "Pixel-perfect snapping guidelines flash vibrant purple highlighting uniform scale alignment across selected workspace items.",
  narrative_text_matrix: "Text characters reveal themselves gracefully through dynamic typewriter animations paired with contextual state color shifts.",
  audio_temporal_sequencer: "An audio sample fires cleanly on the exact target millisecond beat coordinate as the timeline clock tracker updates.",
  network_multiplayer_lobby: "A synchronized peer avatar indicator sweeps across your screen rendering a low-latency movement trailing vector marker.",
  default: "An instant visual/auditory payoff experienced within the first 10 seconds of user interaction",
};

const VISUAL_EXAMPLES: ExampleMap = {
  system_simulation_management: "2D Flat top-down dashboard grids containing explicit state visual monitoring data matrices.",
  realtime_reactive_toy: "2D Flat high-performance canvas loops drawing procedural vectors or processing high frame-rate asset changes.",
  spatial_3d_immersive: "3D Space viewports executing perspective projections, customized mesh tracking, and directional lighting matrix calculations.",
  node_matrix_logic_tool: "2D Infinite layout workspace processing bezier wire traces, grid maps, or structural matrix boundaries.",
  creative_authoring_canvas: "2D Flat coordinate workspace using dedicated layered canvases, isolated frame targets, and vector transform handles.",
  narrative_text_matrix: "Highly responsive typography layout arrays, contextual messaging nodes, and clear alphanumeric forms architecture.",
  audio_temporal_sequencer: "Multi-lane matrix columns, linear time grids, scrolling track layout playheads, and vector soundwave visualizations.",
  network_multiplayer_lobby: "Multi-agent canvas arenas displaying localized socket state changes, tracking tags, and shared spatial parameters.",
  default: "2D Flat for high-performance canvas work, or 3D Space if depth spatialization is required",
};

const SCREEN_EXAMPLES: ExampleMap = {
  system_simulation_management: "Desktop Browser Layouts — prioritized for wide display areas, compound structural tracking widgets, and pointer inputs.",
  realtime_reactive_toy: "Mobile Device Viewports — prioritized for single-hand screen tap gestures, high-frequency frame updates, or device camera hooks.",
  spatial_3d_immersive: "Universal WebGL Web Viewports / VR HMD Handlers — scaling from standard browser tags to fully spatial projection frames.",
  node_matrix_logic_tool: "Widescreen Web Viewports — utilizing high pointer accuracy, scrolling coordinate systems, and detailed inspectors.",
  creative_authoring_canvas: "High-Resolution Desktop Views — utilizing deep keyboard modifier structures, file pipeline links, and exact stylus tracing.",
  narrative_text_matrix: "Cross-Platform Responsive HTML Containers — scaling seamlessly from compact mobile chat frames up to dense widescreen panels.",
  audio_temporal_sequencer: "Widescreen Tablet / Desktop Systems — mapping out grid column configurations to maximize timeline touch visibility.",
  network_multiplayer_lobby: "Universal Client Websockets — eliminating localized file configuration downloads to ensure direct connection speeds.",
  default: "Select the primary display environment — targeting multiple channels on day one causes scope death",
};

const ART_PIPELINE_EXAMPLES: ExampleMap = {
  system_simulation_management: "Clean UI Primitives — standard layout blocks, structural system font structures, and raw SVG vector nodes.",
  realtime_reactive_toy: "Procedural Noise Generators — mathematical canvas variations, runtime particle systems, and basic asset textures.",
  spatial_3d_immersive: "Optimized Low-Poly Meshes — leveraging standardized GLTF/OBJ model resources from open structural repositories.",
  node_matrix_logic_tool: "Functional Geometry Layers — color-coded card primitives, vector line strokes, and basic state status shapes.",
  creative_authoring_canvas: "Custom SVG Layout Nodes — custom interface tool blocks and raw geometry shapes compiled by the creator.",
  narrative_text_matrix: "Typography and Color Themes — leveraging robust CSS tokens and structural layout weights instead of file-heavy graphic imagery.",
  audio_temporal_sequencer: "Vector Icon Interfaces — clear descriptive labels bound over underlying data channels and tracking rows.",
  network_multiplayer_lobby: "Identity Block Identifiers — primitive color-coded tags representing separate external connected socket targets.",
  default: "Basic shapes and raw primitives until your application's interactive loop is proven",
};

// ── Section 2 Mapping: Backend Generation (AI-Predicted Blueprinting) ───────
const ENGINE_EXAMPLES: ExampleMap = {
  system_simulation_management: "React Virtualized Canvas Layers — optimizing high-frequency state structural loops without DOM parsing drops.",
  realtime_reactive_toy: "Phaser 3 / Vanilla HTML5 Canvas — ensuring consistent 60 FPS update ticks for low-overhead interactive actions.",
  spatial_3d_immersive: "Three.js / React Three Fiber (R3F) — setting up high-performance WebGL asset configurations inside web environments.",
  node_matrix_logic_tool: "React Flow / Svelte Flow — dropping component boilerplate coding cycles via highly stable graph interfaces.",
  creative_authoring_canvas: "PixiJS / Custom 2D Canvas Engine — controlling raw frame buffer layers to facilitate fluid vector manipulation loops.",
  narrative_text_matrix: "Next.js / Tailwind CSS Frameworks — processing rapid structural text modifications with reliable state route mappings.",
  audio_temporal_sequencer: "Web Audio API / Tone.js Context — decoupling high-accuracy sound time tracking from main UI paint delays.",
  network_multiplayer_lobby: "Socket.io / Geckos.io + Node.js Express — delivering rapid payload synchronization via WebSockets or WebRTC.",
  default: "Godot 4 or tailored Javascript Canvas APIs — ensure your selection minimizes initialization bloat",
};

const INPUT_EXAMPLES: ExampleMap = {
  system_simulation_management: "pointerdown tracking for bounding box selections + input monitoring on custom parameter parameters.",
  realtime_reactive_toy: "High-frequency pointermove listening or device gyroscope matrix polling with active multi-touch blocking.",
  spatial_3d_immersive: "Pointer Lock API capturing delta movement inputs, paired with mouse wheel listeners mapping directly to camera FOV.",
  node_matrix_logic_tool: "Click interaction catches evaluating target node selections; programmatic drop tracking mapping canvas link extensions.",
  creative_authoring_canvas: "Pointer tracking structures watching modifier registers (Shift, Alt) paired with mouse dragging delta arrays.",
  narrative_text_matrix: "Standard input focus routines intercepting keydown events to route validation parsing engines directly on string submits.",
  audio_temporal_sequencer: "Immediate touch/click registers bypassing event bubbling delays to link input hits instantly to matrix time positions.",
  network_multiplayer_lobby: "Throttled pointer and event coordinate sweeps packaging positional vector objects for packet dispatch cycles.",
  default: "Isolate only the critical hardware events needed to satisfy the core interactive verb",
};

const LOOP_EXAMPLES: ExampleMap = {
  system_simulation_management: "Fetch Structural Matrix State → Process Simulation Rules → Check Resource Alerts → Repaint Dashboard Layout Components",
  realtime_reactive_toy: "Poll Input Coordinates → Calculate Object Trajectories → Evaluate Collider Boundaries → Render Asset Canvas Frame Buffers",
  spatial_3d_immersive: "Capture Look Trajectories → Calculate Camera Projection Transformations → Animate Mesh Transformations → Render 3D Scene Viewport",
  node_matrix_logic_tool: "Catch Graph Modification → Traverse Active Logical Vectors → Verify Loop Integrity → Recompile Process Chain Evaluations",
  creative_authoring_canvas: "Trace Brush Matrix Coordinates → Mutate active Bitmap Layer Vectors → Update Selection Box Dimensions → Flush Canvas view",
  narrative_text_matrix: "Await String Submission Event → Run Input Validation Rules → Process Narrative State Branches → Stream Typographic Updates",
  audio_temporal_sequencer: "Verify Clock Subdivisions → Step Audio Node Pointer Array → Trigger Sample Audio Buffers → Sync Main Thread UI Markers",
  network_multiplayer_lobby: "Serialize Client Changes → Broadcast Payload to Socket Port → Parse incoming Network Room Vector Deltas → Interpolate Remote Actors",
  default: "Init → State Mutate → Render → Reset; enforce strict decoupling under 5 foundational engine states",
};

const VARIABLES_EXAMPLES: ExampleMap = {
  system_simulation_management: "simulationSpeed, activeSystemMetrics[], resourceStorageMap{}, notificationQueue[], calculationIntervalMs",
  realtime_reactive_toy: "particleBuffer[], frameTickRate, gestureTargetX, gestureTargetY, interactionStreakCount, maximumScoreRecord",
  spatial_3d_immersive: "cameraTargetVector3, meshRotationMatrix, perspectiveFovAngle, activelySelectedMeshUuid, isHardwareWebGpuEnabled",
  node_matrix_logic_tool: "nodesGraphMap{}, activeEdgeConnections[], workflowSelectionId, dependencyVerificationErrors[], nodeCompilationTimeMs",
  creative_authoring_canvas: "activeCanvasToolString, workspaceZoomFactor, targetedLayerIndex, boundingBoxAnchors[], trackingHistoryStack[]",
  narrative_text_matrix: "activeStoryNodeId, textInputBuffer, parsedTokensArray[], processingStateBoolean, accumulatedMistakesCount",
  audio_temporal_sequencer: "playbackTempoBpm, masterSequenceMatrix[][], activeAudioNodesList[], lookaheadBufferMs, nextScheduledNoteTime",
  network_multiplayer_lobby: "assignedClientId, activeRoomPeersMap{}, serverLatencyPingMs, pendingPayloadQueue[], isSocketConnectedBoolean",
  default: "Track only properties that can mutate during a live user loop — defer history stacks and analytics integrations",
};

const SAVE_EXAMPLES: ExampleMap = {
  system_simulation_management: "JSON snapshot string exported to local indexedDB storage arrays; scheduled state loops compile every 30 seconds.",
  realtime_reactive_toy: "Single key localStorage parameter mapping integer scores; zero authentication wrappers required to complete step.",
  spatial_3d_immersive: "Volatile Session State — platform flushes adjustments back to absolute default transform scales upon page refresh loops.",
  node_matrix_logic_tool: "Compressed Base64 configuration vectors written directly inside the browser URL query string for effortless text link sharing.",
  creative_authoring_canvas: "Automated local client workspace cache instances paired with standalone file export triggers formatting native system saves.",
  narrative_text_matrix: "Lightweight localStorage cookie targets retaining baseline milestones completed or active progression path keys.",
  audio_temporal_sequencer: "Lightweight sequence index array configurations packaged inside a single downloadable JSON text scheme.",
  network_multiplayer_lobby: "Server-authoritative database operations triggered exclusively across major global transaction points.",
  default: "Session-only memory structures — skip writing remote database schemas until your MVP loop functions perfectly",
};

const PRIMITIVE_EXAMPLES: ExampleMap = {
  system_simulation_management: "System nodes = gray rounded cards; pipelines = green connecting paths; data points = tiny pulsing circles",
  realtime_reactive_toy: "Interactive nodes = yellow rings; particle emitters = 4x4 red blocks; interaction barriers = dark panels",
  spatial_3d_immersive: "Asset model = basic cube mesh; point lights = bright wireframe spheres; tracking zones = ground planes",
  node_matrix_logic_tool: "Execution steps = dark gray banners; entry variables = blue tabs; link points = white circles",
  creative_authoring_canvas: "Canvas layer boundary = thin blue borders; user element selections = transparent gray overlays",
  narrative_text_matrix: "Input target blockages = solid border rectangles; unverified characters = text placeholders",
  audio_temporal_sequencer: "Active pads = bright green squares; dormant tracking channels = dark grey layout tracks; active playhead = neon bar line",
  network_multiplayer_lobby: "Local user entity = distinct green dot; external peer objects = raw orange tracking circles",
  default: "Enforce complete layout greyboxing using plain vector primitives before importing finalized visual art layers",
};

const FATAL_MISTAKE_EXAMPLES: ExampleMap = {
  system_simulation_management: "Assembling structural reporting tracking charts before completing the foundational math state parsing speeds.",
  realtime_reactive_toy: "Wrapping basic canvas animations inside complex layout libraries, causing execution lag across low-end screens.",
  spatial_3d_immersive: "Spending development weeks optimizing custom 3D model geometries before building baseline navigation coordinate scripts.",
  node_matrix_logic_tool: "Writing intricate multi-tier loop checking parsers before establishing reliable pointer trace line anchors on the canvas.",
  creative_authoring_canvas: "Instantiating deeply nested canvas undo stacks before proving standard shape transform rendering operations.",
  narrative_text_matrix: "Bundling large external AI model weight steps locally instead of processing clean standard regex or simple text dictionaries.",
  audio_temporal_sequencer: "Running the master sound tick counter over standard window.setTimeout routines instead of scheduling on the AudioContext clock.",
  network_multiplayer_lobby: "Enabling complete peer side physics calculation prediction algorithms before verifying fundamental room packet broadcast systems.",
  default: "Over-engineering underlying data architecture layers before testing if the manual interaction loop is fun or functional",
};

// ── Selection Router ─────────────────────────────────────────────────────────
function pick(map: ExampleMap, context: ContextualExampleResolverContext): string {
  return map[detectExperientialArchetype(context)];
}

export const experientialContextualExamples = {
  inspiration_baseline: (context: ContextualExampleResolverContext) =>
    pick(INSPIRATION_EXAMPLES, context),
  core_interactive_verb: (context: ContextualExampleResolverContext) =>
    pick(VERB_EXAMPLES, context),
  hook_payload: (context: ContextualExampleResolverContext) =>
    pick(HOOK_EXAMPLES, context),
  visual_dimension: (context: ContextualExampleResolverContext) =>
    pick(VISUAL_EXAMPLES, context),
  target_screen: (context: ContextualExampleResolverContext) =>
    pick(SCREEN_EXAMPLES, context),
  art_pipeline: (context: ContextualExampleResolverContext) =>
    pick(ART_PIPELINE_EXAMPLES, context),
  core_technical_engine: (context: ContextualExampleResolverContext) =>
    pick(ENGINE_EXAMPLES, context),
  input_tracking_blueprint: (context: ContextualExampleResolverContext) =>
    pick(INPUT_EXAMPLES, context),
  game_loop_architecture: (context: ContextualExampleResolverContext) =>
    pick(LOOP_EXAMPLES, context),
  live_variables_list: (context: ContextualExampleResolverContext) =>
    pick(VARIABLES_EXAMPLES, context),
  long_term_save_strategy: (context: ContextualExampleResolverContext) =>
    pick(SAVE_EXAMPLES, context),
  primitive_shape_substitution: (context: ContextualExampleResolverContext) =>
    pick(PRIMITIVE_EXAMPLES, context),
  fatal_coding_mistake: (context: ContextualExampleResolverContext) =>
    pick(FATAL_MISTAKE_EXAMPLES, context),
};