import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import type { z } from "zod";
import { friendlyAiError } from "./ai-errors";
import { guardAiRequest } from "./ai-guard.server";

/**
 * Calls the official OpenAI API directly. This module is imported only from
 * TanStack Start server-function handlers, never from a React/browser component.
 *
 * Required secret (server only): OPENAI_API_KEY
 * Optional server configuration: OPENAI_MODEL (defaults to gpt-5-mini).
 * Do not use VITE_ variables, which are publicly exposed by Vite.
 */
const DEFAULT_MODEL = "gpt-5-mini";
const MAX_INPUT_CHARS = 40_000;

function readSettings() {
  const key = process.env["OPENAI_API_KEY"]?.trim();
  if (!key) {
    throw new Error("OPENAI_API_KEY_NOT_CONFIGURED");
  }
  const model = process.env["OPENAI_MODEL"]?.trim() || DEFAULT_MODEL;
  return { key, model };
}

function provider(key: string) {
  // No gateway baseURL or Lovable headers: requests go to api.openai.com.
  return createOpenAI({ apiKey: key });
}

function logFailure(action: string, error: unknown): void {
  // Do not log credentials, prompts, document content or raw provider errors.
  const candidate = error && typeof error === "object"
    ? error as { statusCode?: number; status?: number; name?: string; cause?: unknown }
    : null;
  console.error("[VetEstudo OpenAI]", action, {
    status: candidate?.statusCode ?? candidate?.status ?? null,
    type: candidate?.name ?? "UnknownError",
  });
}

type GenerationOptions = { maxOutputTokens?: number };

function budget(value: number | undefined, defaultValue: number, hardLimit: number) {
  return Math.max(32, Math.min(hardLimit, Number.isFinite(value) ? Math.floor(value!) : defaultValue));
}

export async function aiText(system: string, prompt: string, options: GenerationOptions = {}): Promise<string> {
  guardAiRequest();
  try {
    const { key, model } = readSettings();
    const result = await generateText({
      model: provider(key).responses(model),
      system,
      prompt: prompt.slice(0, MAX_INPUT_CHARS),
      providerOptions: { openai: { store: false, reasoningEffort: "low" } },
      maxOutputTokens: budget(options.maxOutputTokens, 2200, 3000),
      maxRetries: 1,
      timeout: 60_000,
    });
    const text = result.text?.trim();
    if (!text) throw new Error("EMPTY_AI_RESPONSE");
    return text;
  } catch (error) {
    logFailure("text", error);
    throw new Error(friendlyAiError(error));
  }
}

export async function aiObject<T>(
  system: string,
  prompt: string,
  schema: z.ZodType<T>,
  options: GenerationOptions = {},
): Promise<T> {
  guardAiRequest();
  try {
    const { key, model } = readSettings();
    const result = await generateText({
      model: provider(key).responses(model),
      system,
      prompt: prompt.slice(0, MAX_INPUT_CHARS),
      output: Output.object({ schema }),
      providerOptions: { openai: { store: false, reasoningEffort: "low" } },
      maxOutputTokens: budget(options.maxOutputTokens, 2700, 3600),
      maxRetries: 1,
      timeout: 70_000,
    });
    return schema.parse(result.output);
  } catch (error) {
    logFailure("object", error);
    throw new Error(friendlyAiError(error));
  }
}
