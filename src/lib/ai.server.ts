import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import type { z } from "zod";
import { friendlyAiError } from "./ai-errors";

const BASE_URL = "https://ai.gateway.lovable.dev/v1";
// Lovable documents openai/gpt-5.5 as an available fast text model.
// The old openai/gpt-6-astra slug was not listed among the supported models.
const DEFAULT_MODEL = "openai/gpt-5.5";

function configuredModel(): string {
  return process.env["LOVABLE_AI_MODEL"]?.trim() || DEFAULT_MODEL;
}

function provider() {
  const apiKey = process.env["LOVABLE_API_KEY"]?.trim();
  if (!apiKey) throw new Error("Configuração de IA em falta.");
  return createOpenAI({
    baseURL: BASE_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
}

function logFailure(action: string, error: unknown): void {
  // Avoid logging user prompts, uploaded content, raw gateway error messages or API keys.
  const record = error && typeof error === "object" ? error as { statusCode?: number; status?: number; name?: string } : null;
  console.error("[VetEstudo AI]", action, {
    code: record?.statusCode ?? record?.status ?? null,
    kind: record?.name ?? "UnknownError",
    model: configuredModel(),
  });
}

export async function aiText(system: string, prompt: string): Promise<string> {
  try {
    const result = await generateText({
      model: provider().responses(configuredModel()),
      system,
      prompt,
      maxOutputTokens: 2800,
      maxRetries: 1,
      timeout: 60000,
    });
    const text = result.text?.trim();
    if (!text) throw new Error("Resposta de texto vazia.");
    return text;
  } catch (error) {
    logFailure("text", error);
    throw new Error(friendlyAiError(error));
  }
}

export async function aiObject<T>(system: string, prompt: string, schema: z.ZodType<T>): Promise<T> {
  try {
    const result = await generateText({
      model: provider().responses(configuredModel()),
      system,
      prompt,
      output: Output.object({ schema }),
      maxOutputTokens: 3600,
      maxRetries: 1,
      timeout: 70000,
    });
    return schema.parse(result.output);
  } catch (error) {
    logFailure("object", error);
    throw new Error(friendlyAiError(error));
  }
}
