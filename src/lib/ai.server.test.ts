import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const mocks = vi.hoisted(() => ({
  providerOptions: vi.fn(),
  modelName: vi.fn(),
  generate: vi.fn(),
  checkLimit: vi.fn(),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: (options: unknown) => {
    mocks.providerOptions(options);
    return { responses: (model: string) => { mocks.modelName(model); return { modelId: model }; } };
  },
}));
vi.mock("ai", () => ({
  generateText: mocks.generate,
  Output: { object: ({ schema }: { schema: unknown }) => ({ schema }) },
}));
vi.mock("./ai-guard.server", () => ({ guardAiRequest: mocks.checkLimit }));

import { aiObject, aiText } from "./ai.server";

describe("API OpenAI direta, com chave apenas no servidor", () => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousModel = process.env.OPENAI_MODEL;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-placeholder-not-a-real-key";
    delete process.env.OPENAI_MODEL;
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = previousModel;
  });

  it("liga ao provedor oficial sem URL nem cabeçalhos do Lovable", async () => {
    mocks.generate.mockResolvedValue({ text: "Teste concluído" });
    const text = await aiText("Tutor", "Teste");
    expect(text).toBe("Teste concluído");
    expect(mocks.providerOptions).toHaveBeenCalledWith({ apiKey: "test-placeholder-not-a-real-key" });
    expect(mocks.modelName).toHaveBeenCalledWith("gpt-5-mini");
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ providerOptions: { openai: { store: false, reasoningEffort: "low" } } }));
    expect(mocks.checkLimit).toHaveBeenCalledTimes(1);
  });

  it("permite escolher o modelo pelo segredo de configuração do servidor", async () => {
    process.env.OPENAI_MODEL = "gpt-4.1-mini";
    mocks.generate.mockResolvedValue({ text: "OK" });
    await aiText("Tutor", "Teste", { maxOutputTokens: 64 });
    expect(mocks.modelName).toHaveBeenCalledWith("gpt-4.1-mini");
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ maxOutputTokens: 64 }));
  });

  it("rejeita uma chave em falta sem efetuar chamadas externas", async () => {
    delete process.env.OPENAI_API_KEY;
    await expect(aiText("Tutor", "Teste")).rejects.toThrow("OPENAI_API_KEY");
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("preserva a geração estruturada para quizzes e flashcards", async () => {
    mocks.generate.mockResolvedValue({ output: { cards: [{ question: "Qual é a função do coração?", answer: "Bombear sangue." }] } });
    const result = await aiObject("Tutor", "Gera um cartão",
      z.object({ cards: z.array(z.object({ question: z.string(), answer: z.string() })) }));
    expect(result.cards).toHaveLength(1);
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ output: expect.objectContaining({ schema: expect.anything() }) }));
  });
});
