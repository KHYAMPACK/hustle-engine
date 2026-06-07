/**
 * AI module — single entry point for onboarding chat intelligence.
 *
 * Layout:
 * - gemini-client.ts     Model calls, retries, fallback chain
 * - gauntlet/process-turn.ts   Turn orchestrator (Pass A → state → Pass B)
 * - gauntlet/pass-a-analyst.ts Background analyst (structured JSON, temp 0)
 * - gauntlet/pass-b-persona.ts User-facing voice (conversational, temp 0.65)
 * - gauntlet/state-machine.ts  Escalation, skip protocol, SER rules
 * - gauntlet/triage.ts         Pending pitch → category routing
 * - gauntlet/types.ts          Exception scripts, forbidden phrases, types
 * - gauntlet/taxonomy.ts       8-category triage matrix
 * - gauntlet/category-registry.ts  Dynamic questionnaire configs
 * - gauntlet/categories/       Per-track field definitions (1.1 SaaS, stubs)
 * - gauntlet/client.ts         Browser helper for POST /api/chat
 */

export { generateContentWithRetry, isGeminiCapacityError } from "@/lib/ai/gemini-client";
export { processGauntletTurn } from "@/lib/ai/gauntlet/process-turn";
export { postGauntletChat } from "@/lib/ai/gauntlet/client";
