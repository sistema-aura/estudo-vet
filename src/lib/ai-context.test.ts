import { describe, expect, it } from "vitest";
import { pdfContext } from "./ai-context";

describe("PDF context for AI", () => {
  it("preserves short PDF text", () => {
    expect(pdfContext("Coração e pulmões", 400)).toBe("Coração e pulmões");
  });
  it("limits long documents without keeping only the beginning", () => {
    const source = "Início ".repeat(8000) + "passagem final importante";
    const result = pdfContext(source, 10000);
    expect(result.length).toBeLessThanOrEqual(10000);
    expect(result).toContain("passagem final importante");
  });
});
