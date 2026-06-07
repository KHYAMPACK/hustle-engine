import { GoogleGenAI } from "@google/genai";

/** Models verified for generateContent on the current Gemini API (v1beta). */
const MODEL_FALLBACK_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
] as const;

const MAX_RETRIES_PER_MODEL = 2;
const BASE_RETRY_DELAY_MS = 1000;

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("Missing GOOGLE_GENERATIVE_AI_API_KEY.");
  }

  if (!client) {
    client = new GoogleGenAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });
  }

  return client;
}

type GenerateContentParams = Parameters<
  GoogleGenAI["models"]["generateContent"]
>[0];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractErrorRecord(error: unknown): Record<string, unknown> | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const record = error as Record<string, unknown>;
  if (typeof record.error === "object" && record.error !== null) {
    return { ...record, ...(record.error as Record<string, unknown>) };
  }

  return record;
}

export function isModelNotFoundError(error: unknown): boolean {
  const record = extractErrorRecord(error);
  if (!record) {
    return false;
  }

  const code = record.code;
  const status = String(record.status ?? "");
  const message = String(record.message ?? "");

  if (code === 404 || code === "404" || status === "NOT_FOUND") {
    return true;
  }

  return /is not found|not supported for generateContent/i.test(message);
}

export function isRetryableGeminiError(error: unknown): boolean {
  if (isModelNotFoundError(error)) {
    return false;
  }

  const record = extractErrorRecord(error);
  if (!record) {
    return false;
  }

  const code = record.code;
  const status = String(record.status ?? "");
  const message = String(record.message ?? "");

  if (code === 503 || code === 429 || code === "503" || code === "429") {
    return true;
  }

  if (status === "UNAVAILABLE" || status === "RESOURCE_EXHAUSTED") {
    return true;
  }

  return /high demand|try again later|overloaded|rate limit|unavailable/i.test(
    message,
  );
}

export class GeminiCapacityError extends Error {
  constructor(
    message = "The AI model is temporarily overloaded. Please wait a few seconds and try again.",
  ) {
    super(message);
    this.name = "GeminiCapacityError";
  }
}

export function isGeminiCapacityError(error: unknown): boolean {
  return error instanceof GeminiCapacityError || isRetryableGeminiError(error);
}

export async function generateContentWithRetry(
  params: GenerateContentParams,
): Promise<Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>> {
  const preferredModel = params.model ?? MODEL_FALLBACK_CHAIN[0];
  const modelChain = [
    preferredModel,
    ...MODEL_FALLBACK_CHAIN.filter((model) => model !== preferredModel),
  ];

  let lastError: unknown;
  let sawCapacityError = false;

  for (const model of modelChain) {
    for (let attempt = 0; attempt < MAX_RETRIES_PER_MODEL; attempt += 1) {
      try {
        return await getGeminiClient().models.generateContent({
          ...params,
          model,
        });
      } catch (error) {
        lastError = error;

        if (isRetryableGeminiError(error)) {
          sawCapacityError = true;
        }

        if (isModelNotFoundError(error)) {
          break;
        }

        const canRetry =
          isRetryableGeminiError(error) && attempt < MAX_RETRIES_PER_MODEL - 1;

        if (canRetry) {
          await sleep(BASE_RETRY_DELAY_MS * 2 ** attempt);
          continue;
        }

        break;
      }
    }
  }

  if (sawCapacityError) {
    throw new GeminiCapacityError();
  }

  if (isGeminiCapacityError(lastError)) {
    throw new GeminiCapacityError();
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Gemini request failed.");
}

export { MODEL_FALLBACK_CHAIN };
