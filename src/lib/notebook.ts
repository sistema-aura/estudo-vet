/** Versioned local-only notebook model. Importing v1 data never deletes the original keys. */
export const NOTEBOOK_STORAGE_KEY = "vetestudo-cadernos-v2";
export const LEGACY_PAGES_KEY = "vetestudo-caderno-v1";
export const LEGACY_TITLE_KEY = "vetestudo-caderno-title";
export const PAGE_WIDTH = 1000;
export const PAGE_HEIGHT = 1414;

export type Paper = "lines" | "grid" | "dots" | "blank";
export type DrawingTool = "pen" | "highlighter" | "eraser" | "hand";
export type Point = { x: number; y: number };
export type Stroke = { points: Point[]; color: string; width: number; tool: "pen" | "highlighter" };
export type NotebookPage = {
  id: string; title: string; paper: Paper; strokes: Stroke[];
  text: string; createdAt: number; updatedAt: number;
};
export type Notebook = {
  id: string; title: string; pages: NotebookPage[];
  createdAt: number; updatedAt: number;
};
export type NotebookLibrary = {
  version: 2; notebooks: Notebook[];
  activeNotebookId: string; activePageId: string;
};

export function createPage(paper: Paper = "lines", title = "Nova página"): NotebookPage {
  const now = Date.now();
  return { id: crypto.randomUUID(), title, paper, strokes: [], text: "", createdAt: now, updatedAt: now };
}
export function createNotebook(title = "Novo caderno"): Notebook {
  const now = Date.now();
  return { id: crypto.randomUUID(), title, pages: [createPage()], createdAt: now, updatedAt: now };
}
export function initialLibrary(): NotebookLibrary {
  const notebook = createNotebook("O meu caderno");
  return { version: 2, notebooks: [notebook], activeNotebookId: notebook.id, activePageId: notebook.pages[0]!.id };
}
export function validColor(input: unknown): input is string {
  return typeof input === "string" && /^#[0-9a-fA-F]{6}$/.test(input);
}
function objectValue(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
const validPaper = (value: unknown): value is Paper =>
  value === "lines" || value === "grid" || value === "dots" || value === "blank";

export function normalizeStroke(value: unknown): Stroke | null {
  const s = objectValue(value);
  if (!s || !Array.isArray(s.points) || !s.points.length || s.points.length > 30000 ||
      !validColor(s.color) || typeof s.width !== "number" || !Number.isFinite(s.width) ||
      s.width < 0.5 || s.width > 150 || (s.tool !== "pen" && s.tool !== "highlighter" && s.tool !== "eraser")) return null;
  const points: Point[] = [];
  for (const entry of s.points) {
    const p = objectValue(entry);
    if (!p || typeof p.x !== "number" || typeof p.y !== "number" || !Number.isFinite(p.x) ||
        !Number.isFinite(p.y) || p.x < 0 || p.x > PAGE_WIDTH || p.y < 0 || p.y > PAGE_HEIGHT) return null;
    points.push({ x: p.x, y: p.y });
  }
  // Preserve historical eraser strokes as opaque white paint to avoid resurrecting erased writing.
  // The new editor uses a reversible vector eraser instead of destination-out.
  return { points, color: s.tool === "eraser" ? "#ffffff" : s.color, width: s.width, tool: s.tool === "eraser" ? "pen" : s.tool };
}
function normalizedStrokes(value: unknown, limit = 15000): Stroke[] {
  if (!Array.isArray(value) || value.length > limit) throw new Error("Demasiados traços no caderno.");
  const result: Stroke[] = [];
  for (const entry of value) {
    const stroke = normalizeStroke(entry);
    if (stroke) result.push(stroke);
  }
  return result;
}
function normalizePage(value: unknown): NotebookPage | null {
  const p = objectValue(value);
  if (!p || !Array.isArray(p.strokes)) return null;
  return {
    id: typeof p.id === "string" && p.id.length <= 100 && p.id ? p.id : crypto.randomUUID(),
    title: typeof p.title === "string" ? p.title.slice(0, 100) : "Nova página",
    paper: validPaper(p.paper) ? p.paper : "lines",
    strokes: normalizedStrokes(p.strokes),
    text: typeof p.text === "string" ? p.text.slice(0, 100000) : "",
    createdAt: typeof p.createdAt === "number" && Number.isFinite(p.createdAt) ? p.createdAt : Date.now(),
    updatedAt: typeof p.updatedAt === "number" && Number.isFinite(p.updatedAt) ? p.updatedAt : Date.now(),
  };
}
function normalizeNotebook(value: unknown): Notebook | null {
  const n = objectValue(value);
  if (!n || !Array.isArray(n.pages) || n.pages.length > 250) return null;
  const pages = n.pages.map(normalizePage).filter((p): p is NotebookPage => p !== null);
  return {
    id: typeof n.id === "string" && n.id.length <= 100 && n.id ? n.id : crypto.randomUUID(),
    title: typeof n.title === "string" && n.title.trim() ? n.title.slice(0, 100) : "Caderno sem título",
    pages: pages.length ? pages : [createPage()],
    createdAt: typeof n.createdAt === "number" && Number.isFinite(n.createdAt) ? n.createdAt : Date.now(),
    updatedAt: typeof n.updatedAt === "number" && Number.isFinite(n.updatedAt) ? n.updatedAt : Date.now(),
  };
}
export function parseLibrary(value: unknown): NotebookLibrary {
  const input = objectValue(value);
  if (!input || input.version !== 2 || !Array.isArray(input.notebooks) || input.notebooks.length > 100)
    throw new Error("Este ficheiro não contém uma biblioteca de cadernos compatível.");
  const notebooks = input.notebooks.map(normalizeNotebook).filter((n): n is Notebook => n !== null);
  if (!notebooks.length) throw new Error("A cópia de segurança não contém cadernos válidos.");
  let active = notebooks.find(n => n.id === input.activeNotebookId) ?? notebooks[0]!;
  const page = active.pages.find(p => p.id === input.activePageId) ?? active.pages[0]!;
  return { version: 2, notebooks, activeNotebookId: active.id, activePageId: page.id };
}
export function legacyToLibrary(pagesValue: unknown, title: string): NotebookLibrary | null {
  if (!Array.isArray(pagesValue) || !pagesValue.length || pagesValue.length > 250) return null;
  const pages = pagesValue.map((value, index) => {
    const raw = objectValue(value);
    if (!raw || !Array.isArray(raw.strokes)) return null;
    return normalizePage({ title: "Página " + (index + 1), paper: "lines", strokes: raw.strokes, text: "" });
  }).filter((p): p is NotebookPage => p !== null);
  if (!pages.length) return null;
  const now = Date.now();
  const notebook: Notebook = { id: crypto.randomUUID(), title: title.trim().slice(0, 100) || "O meu caderno", pages, createdAt: now, updatedAt: now };
  return { version: 2, notebooks: [notebook], activeNotebookId: notebook.id, activePageId: pages[0]!.id };
}
export function mergeLibraries(current: NotebookLibrary, imported: NotebookLibrary): NotebookLibrary {
  const notebooks = [...current.notebooks];
  for (const notebook of imported.notebooks) {
    const copy: Notebook = {
      ...notebook, id: crypto.randomUUID(),
      title: notebook.title + " (importado)",
      pages: notebook.pages.map(p => ({ ...p, id: crypto.randomUUID(), strokes: p.strokes.map(s => ({ ...s, points: s.points.map(point => ({ ...point })) })) })),
      updatedAt: Date.now(),
    };
    notebooks.push(copy);
  }
  if (notebooks.length > 100) throw new Error("Limite de 100 cadernos atingido.");
  return { ...current, notebooks };
}

function distanceFromSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = dx || dy ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
/** Object eraser: removes whole vector strokes, not holes in the white page background. */
export function eraseStrokes(strokes: Stroke[], point: Point, radius: number): Stroke[] {
  return strokes.filter(stroke => {
    if (!stroke.points.length) return false;
    const hit = stroke.points.some((p, index) => {
      if (index === 0) return Math.hypot(p.x - point.x, p.y - point.y) <= radius + stroke.width / 2;
      return distanceFromSegment(point, stroke.points[index - 1]!, p) <= radius + stroke.width / 2;
    });
    return !hit;
  });
}
export function strokePath(stroke: Stroke): string {
  return stroke.points.map((p, index) => (index ? "L" : "M") + p.x + " " + p.y).join(" ");
}
