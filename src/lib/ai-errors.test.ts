import { describe, expect, it } from "vitest";
import { friendlyAiError } from "./ai-errors";

describe("OpenAI API error messages", () => {
  it("identifies a missing server-side key without asking to expose it in the browser", () => {
    const message = friendlyAiError(new Error("OPENAI_API_KEY_NOT_CONFIGURED"));
    expect(message).toContain("OPENAI_API_KEY");
    expect(message).toContain("servidor");
  });
  it("distinguishes insufficient quota from temporary rate limits", () => {
    expect(friendlyAiError({ statusCode: 429, data: { error: { code: "insufficient_quota" } } })).toContain("saldo");
    expect(friendlyAiError({ statusCode: 429, message: "Rate limit reached" })).toContain("pedidos");
    expect(friendlyAiError({ statusCode: 402 })).toContain("saldo");
  });
  it("identifies invalid credentials, permissions and unavailable models", () => {
    expect(friendlyAiError({ statusCode: 401 })).toContain("chave");
    expect(friendlyAiError({ statusCode: 403 })).toContain("permissão");
    expect(friendlyAiError({ statusCode: 404 })).toContain("modelo");
  });
  it("never exposes raw provider messages or credentials", () => {
    const message = friendlyAiError(new Error("Bearer sk-secret-example"));
    expect(message).not.toContain("sk-secret-example");
    expect(message).not.toContain("Bearer");
  });
});
