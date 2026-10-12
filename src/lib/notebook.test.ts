import { describe, expect, it, vi } from "vitest";
import {
  PAGE_WIDTH, createPage, createNotebook, eraseStrokes, legacyToLibrary, mergeLibraries,
  normalizeStroke, parseLibrary, strokePath, type Stroke, type NotebookLibrary,
} from "./notebook";

vi.stubGlobal("crypto", { randomUUID: () => "id-" + Math.random().toString(36).slice(2) });

const stroke: Stroke = {
  tool: "pen", color: "#2563eb", width: 4,
  points: [{ x: 100, y: 100 }, { x: 300, y: 100 }],
};

describe("Caderno digital – escrita e migração", () => {
  it("remove uma linha ao tocar no meio do segmento, mas preserva os outros traços", () => {
    const other: Stroke = { ...stroke, points: [{ x: 700, y: 700 }] };
    const erased = eraseStrokes([stroke, other], { x: 200, y: 100 }, 10);
    expect(erased).toHaveLength(1);
    expect(erased[0]).toEqual(other);
  });

  it("rejeita traços inválidos e permite desenhar dentro da folha", () => {
    expect(normalizeStroke(stroke)).toEqual(stroke);
    expect(normalizeStroke({ ...stroke, points: [{ x: PAGE_WIDTH + 1, y: 100 }] })).toBeNull();
    expect(normalizeStroke({ ...stroke, color: "javascript:alert(1)" })).toBeNull();
    expect(strokePath(stroke)).toBe("M100 100 L300 100");
  });

  it("preserva borrachas legadas como marcações brancas", () => {
    const legacy = { ...stroke, tool: "eraser", width: 24 };
    const converted = normalizeStroke(legacy);
    expect(converted?.tool).toBe("pen");
    expect(converted?.color).toBe("#ffffff");
  });

  it("converte o caderno da versão 1 para vários cadernos sem perder as páginas", () => {
    const old = [{ strokes: [stroke] }, { strokes: [] }];
    const migrated = legacyToLibrary(old, "Anatomia");
    expect(migrated?.version).toBe(2);
    expect(migrated?.notebooks[0]?.title).toBe("Anatomia");
    expect(migrated?.notebooks[0]?.pages).toHaveLength(2);
    expect(migrated?.notebooks[0]?.pages[0]?.strokes).toHaveLength(1);
  });

  it("rejeita backups sem versão e mantém os cadernos ao importar", () => {
    expect(() => parseLibrary({ version: 1, notebooks: [] })).toThrow();
    const n = createNotebook("Aula");
    const current: NotebookLibrary = {
      version: 2, notebooks: [n], activeNotebookId: n.id, activePageId: n.pages[0]!.id,
    };
    const imported = mergeLibraries(current, current);
    expect(imported.notebooks).toHaveLength(2);
    expect(imported.notebooks[1]?.title).toContain("importado");
    expect(imported.notebooks[0]?.id).toBe(n.id);
    expect(imported.activeNotebookId).toBe(n.id);
  });

  it("cria páginas independentes com o papel escolhido", () => {
    const paper = createPage("dots");
    expect(paper.paper).toBe("dots");
    expect(paper.strokes).toEqual([]);
    expect(paper.text).toBe("");
  });
});
