import { describe, expect, it } from "vitest";
import { friendlyAiError } from "./ai-errors";

describe("AI errors", () => {
  it("explains gateway status codes", () => {
    expect(friendlyAiError({ statusCode: 402 })).toContain("créditos");
    expect(friendlyAiError({ statusCode: 429 })).toContain("pedidos");
    expect(friendlyAiError({ statusCode: 404 })).toContain("modelo");
  });
  it("does not include raw server messages", () => {
    const message = friendlyAiError(new Error("private server detail"));
    expect(message).not.toContain("private server detail");
  });
});
