import { createOpenAI } from "@ai-sdk/openai";
import { streamText, Output } from "ai";
import type { z } from "zod";

const BASE_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

function provider() {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("Configuração de IA em falta.");
  return createOpenAI({
    baseURL: BASE_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
}

const opts = { openai: { store: false, reasoningEffort: "low" } };

export async function aiText(system: string, prompt: string) {
  const result = streamText({
    model: provider().responses(MODEL),
    instructions: system,
    prompt,
    providerOptions: opts,
  });
  return await result.text;
}

export async function aiObject<T>(system: string, prompt: string, schema: z.ZodType<T>) {
  const result = streamText({
    model: provider().responses(MODEL),
    instructions: system,
    prompt,
    providerOptions: opts,
    output: Output.object({ schema }),
  });
  return (await result.output) as T;
}
