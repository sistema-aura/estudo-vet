import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { toast } from "sonner";
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Check, ChevronLeft,
  ChevronRight, Copy, Download, Eraser, FileImage, FilePlus2, FolderPlus, Grid3X3,
  Hand, Highlighter, Keyboard, LayoutList, Menu, Minus, MoreHorizontal, NotebookPen,
  Palette, PenLine, Plus, Redo2, RotateCcw, Save, Search, ShieldCheck,
  Trash2, Undo2, Upload, X, ZoomIn, ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  NOTEBOOK_STORAGE_KEY, LEGACY_PAGES_KEY, LEGACY_TITLE_KEY, PAGE_WIDTH, PAGE_HEIGHT,
  createNotebook, createPage, eraseStrokes, initialLibrary, legacyToLibrary,
  mergeLibraries, parseLibrary, strokePath,
  type DrawingTool, type Notebook, type NotebookLibrary, type NotebookPage,
  type Paper, type Point, type Stroke,
} from "@/lib/notebook";

export const Route = createFileRoute("/_authenticated/anotacoes")({
  head: () => ({
    meta: [
      { title: "Caderno digital — VetEstudo" },
      { name: "description", content: "Cadernos digitais para escrita manual, Apple Pencil e apontamentos de estudo." },
    ],
  }),
  component: Anotacoes,
});

const COLORS = [
  { hex: "#16263b", name: "Preto" },
  { hex: "#2563eb", name: "Azul" },
  { hex: "#dc2626", name: "Vermelho" },
  { hex: "#16a34a", name: "Verde" },
  { hex: "#9333ea", name: "Roxo" },
  { hex: "#ea580c", name: "Laranja" },
];
const PAPER_LABELS: Record<Paper, string> = {
  lines: "Pautada", grid: "Quadriculada", dots: "Pontilhada", blank: "Branca",
};
const MAX_HISTORY = 40;
const RESOLUTION = 1.5;

function drawPage(canvas: HTMLCanvasElement, page: NotebookPage, preview?: Stroke | null, override?: Stroke[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(RESOLUTION, 0, 0, RESOLUTION, 0, 0);
  ctx.clearRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  ctx.strokeStyle = "#e4ecf5";
  ctx.lineWidth = 1.15;
  if (page.paper === "lines" || page.paper === "grid") {
    for (let y = 76; y < PAGE_HEIGHT - 40; y += 43) {
      ctx.beginPath(); ctx.moveTo(50, y); ctx.lineTo(PAGE_WIDTH - 50, y); ctx.stroke();
    }
  }
  if (page.paper === "grid") {
    for (let x = 50; x < PAGE_WIDTH - 40; x += 43) {
      ctx.beginPath(); ctx.moveTo(x, 45); ctx.lineTo(x, PAGE_HEIGHT - 45); ctx.stroke();
    }
  }
  if (page.paper === "dots") {
    ctx.fillStyle = "#cbd5e1";
    for (let y = 76; y < PAGE_HEIGHT - 45; y += 43) for (let x = 50; x < PAGE_WIDTH - 40; x += 43) {
      ctx.beginPath(); ctx.arc(x, y, 1.75, 0, Math.PI * 2); ctx.fill();
    }
  }
  const strokes = override ?? page.strokes;
  for (const stroke of [...strokes, ...(preview ? [preview] : [])]) {
    if (!stroke.points.length) continue;
    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.globalAlpha = stroke.tool === "highlighter" ? 0.34 : 1;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    const first = stroke.points[0]!;
    ctx.moveTo(first.x, first.y);
    if (stroke.points.length === 1) {
      ctx.arc(first.x, first.y, stroke.width / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      for (const p of stroke.points.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function PageThumbnail({ page, number, selected, onClick }: {
  page: NotebookPage; number: number; selected: boolean; onClick: () => void;
}) {
  return <button type="button" onClick={onClick}
    aria-current={selected ? "page" : undefined}
    className={"group flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition hover:border-primary " +
      (selected ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-card")}>
    <div className="h-[82px] w-[59px] shrink-0 overflow-hidden rounded border bg-white shadow-sm">
      <svg viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`} className="h-full w-full" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
        {page.paper === "lines" && Array.from({ length: 32 }, (_, i) =>
          <line key={i} x1="50" x2="950" y1={76 + i * 43} y2={76 + i * 43} stroke="#e6eaf1" strokeWidth="3"/>)}
        {page.paper === "grid" && <>
          {Array.from({ length: 32 }, (_, i) => <line key={"h"+i} x1="50" x2="950" y1={76 + i * 43} y2={76 + i * 43} stroke="#e6eaf1" strokeWidth="3"/>)}
          {Array.from({ length: 22 }, (_, i) => <line key={"v"+i} y1="45" y2="1370" x1={50 + i * 43} x2={50 + i * 43} stroke="#e6eaf1" strokeWidth="3"/>)}
        </>}
        {page.strokes.slice(-350).map((s, i) => s.points.length === 1 && s.points[0]
          ? <circle key={i} cx={s.points[0].x} cy={s.points[0].y} r={s.width/2} fill={s.color} opacity={s.tool === "highlighter" ? 0.34 : 1}/>
          : <path key={i} d={strokePath(s)} fill="none" stroke={s.color} strokeWidth={s.width} opacity={s.tool === "highlighter" ? 0.34 : 1} strokeLinecap="round" strokeLinejoin="round"/>)}
      </svg>
    </div>
    <span className="min-w-0 flex-1">
      <span className="block text-xs font-bold text-foreground">Página {number}</span>
      <span className="mt-1 block truncate text-xs text-muted-foreground">{page.title}</span>
      <span className="mt-1 block text-[11px] text-muted-foreground">{page.strokes.length} traços{page.text.trim() ? " · texto" : ""}</span>
    </span>
    <ChevronRight size={16} className={selected ? "text-primary" : "text-muted-foreground"}/>
  </button>;
}

function loadLibrary(): { library: NotebookLibrary; migrated: boolean } {
  try {
    const v2 = window.localStorage.getItem(NOTEBOOK_STORAGE_KEY);
    if (v2) return { library: parseLibrary(JSON.parse(v2)), migrated: false };
  } catch (error) {
    // Do not silently overwrite malformed v2: it may be the only surviving copy.
    throw new Error("Não foi possível ler a biblioteca guardada. Os dados existentes não serão substituídos. " +
      (error instanceof Error ? error.message : ""));
  }
  try {
    const raw = window.localStorage.getItem(LEGACY_PAGES_KEY);
    if (raw) {
      const pages: unknown = JSON.parse(raw);
      const old = legacyToLibrary(pages, window.localStorage.getItem(LEGACY_TITLE_KEY) || "O meu caderno");
      if (old) return { library: old, migrated: true };
    }
  } catch { /* Legacy backup remains untouched. */ }
  return { library: initialLibrary(), migrated: false };
}
type History = { undo: Stroke[][]; redo: Stroke[][] };

function Anotacoes() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const active = useRef<Stroke | null>(null);
  const erasePreview = useRef<Stroke[] | null>(null);
  const eraseChanged = useRef(false);
  const histories = useRef<Record<string, History>>({});
  const importRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<number | null>(null);

  const [library, setLibrary] = useState<NotebookLibrary | null>(null);
  const [startupError, setStartupError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [historyTick, setHistoryTick] = useState(0);
  const [tool, setTool] = useState<DrawingTool>("pen");
  const [color, setColor] = useState(COLORS[0]!.hex);
  const [width, setWidth] = useState(4);
  const [stylusOnly, setStylusOnly] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [showPages, setShowPages] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [query, setQuery] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  useEffect(() => {
    try {
      const result = loadLibrary();
      setLibrary(result.library);
      if (result.migrated) toast.success("Caderno antigo recuperado! O original foi preservado.");
    } catch (error) {
      setStartupError(error instanceof Error ? error.message : "Não foi possível abrir os cadernos guardados.");
    }
  }, []);

  useEffect(() => {
    if (!library) return;
    try {
      window.localStorage.setItem(NOTEBOOK_STORAGE_KEY, JSON.stringify(library));
      setSaveError("");
    } catch {
      setSaveError("Sem espaço para guardar neste dispositivo. Exporta uma cópia de segurança antes de sair.");
    }
  }, [library]);

  const notebook = library?.notebooks.find(n => n.id === library.activeNotebookId);
  const pageIndex = notebook?.pages.findIndex(p => p.id === library?.activePageId) ?? -1;
  const page = notebook?.pages[pageIndex];
  const history = page ? histories.current[page.id] : undefined;
  const undoAvailable = !!history?.undo.length;
  const redoAvailable = !!history?.redo.length;
  void historyTick;

  function repaint(preview: Stroke | null = active.current, erased: Stroke[] | null = erasePreview.current) {
    if (page && canvas.current) drawPage(canvas.current, page, preview, erased ?? undefined);
  }
  useEffect(() => {
    if (page && canvas.current) drawPage(canvas.current, page);
  }, [page]);

  function updateLibrary(updater: (value: NotebookLibrary) => NotebookLibrary) {
    setLibrary(prev => prev ? updater(prev) : prev);
  }
  function updateNotebook(updater: (value: Notebook) => Notebook) {
    updateLibrary(prev => ({
      ...prev,
      notebooks: prev.notebooks.map(n => n.id === prev.activeNotebookId ? updater(n) : n),
    }));
  }
  function updatePage(updater: (value: NotebookPage) => NotebookPage) {
    updateNotebook(n => ({
      ...n,
      updatedAt: Date.now(),
      pages: n.pages.map(p => p.id === library?.activePageId ? updater(p) : p),
    }));
  }
  function ensureHistory(id: string): History {
    if (!histories.current[id]) histories.current[id] = { undo: [], redo: [] };
    return histories.current[id]!;
  }
  function commitStrokes(strokes: Stroke[]) {
    if (!page) return;
    const previous = page.strokes;
    if (strokes === previous) return;
    const h = ensureHistory(page.id);
    h.undo = [...h.undo.slice(-(MAX_HISTORY-1)), previous];
    h.redo = [];
    setHistoryTick(n => n + 1);
    updatePage(p => ({ ...p, strokes, updatedAt: Date.now() }));
  }
  function undo() {
    if (!page) return;
    const h = ensureHistory(page.id);
    const previous = h.undo.pop();
    if (!previous) return;
    h.redo.push(page.strokes);
    setHistoryTick(n => n + 1);
    updatePage(p => ({ ...p, strokes: previous, updatedAt: Date.now() }));
  }
  function redo() {
    if (!page) return;
    const h = ensureHistory(page.id);
    const next = h.redo.pop();
    if (!next) return;
    h.undo.push(page.strokes);
    setHistoryTick(n => n + 1);
    updatePage(p => ({ ...p, strokes: next, updatedAt: Date.now() }));
  }
  function point(event: ReactPointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(PAGE_WIDTH, Math.max(0, (event.clientX - rect.left) * PAGE_WIDTH / rect.width)),
      y: Math.min(PAGE_HEIGHT, Math.max(0, (event.clientY - rect.top) * PAGE_HEIGHT / rect.height)),
    };
  }
  function pointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!page || tool === "hand" || (stylusOnly && event.pointerType !== "pen")) return;
    event.preventDefault();
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Touch fallback */ }
    if (tool === "eraser") {
      eraseChanged.current = false;
      const next = eraseStrokes(page.strokes, point(event), width * 6 + 10);
      eraseChanged.current = next.length !== page.strokes.length;
      erasePreview.current = next;
    } else {
      active.current = { points: [point(event)], color: tool === "highlighter" ? "#fde047" : color,
        width: tool === "highlighter" ? width * 6 : width, tool };
    }
    repaint();
  }
  function pointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!page || (!active.current && !erasePreview.current)) return;
    event.preventDefault();
    const pt = point(event);
    if (active.current) {
      const last = active.current.points.at(-1);
      if (last && Math.hypot(last.x - pt.x, last.y - pt.y) < 1) return;
      active.current.points.push(pt);
    }
    if (erasePreview.current) {
      const before = erasePreview.current;
      const next = eraseStrokes(before, pt, width * 6 + 10);
      if (next.length !== before.length) eraseChanged.current = true;
      erasePreview.current = next;
    }
    if (requestRef.current === null) {
      requestRef.current = requestAnimationFrame(() => {
        requestRef.current = null;
        repaint();
      });
    }
  }
  function finishStroke() {
    if (requestRef.current !== null) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    if (active.current) {
      const stroke = active.current;
      active.current = null;
      if (page) commitStrokes([...page.strokes, { ...stroke, points: [...stroke.points] }]);
    }
    if (erasePreview.current) {
      const remaining = erasePreview.current;
      erasePreview.current = null;
      if (eraseChanged.current) commitStrokes(remaining);
      eraseChanged.current = false;
    }
    repaint(null, null);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.closest("input,textarea,[contenteditable='true']"))) return;
      if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function selectPage(id: string) {
    finishStroke();
    updateLibrary(prev => ({ ...prev, activePageId: id }));
  }
  function selectNotebook(id: string) {
    finishStroke();
    updateLibrary(prev => {
      const target = prev.notebooks.find(n => n.id === id);
      if (!target) return prev;
      return { ...prev, activeNotebookId: id, activePageId: target.pages[0]!.id };
    });
    setQuery("");
    setShowLibrary(false);
    setZoom(100);
  }
  function addNotebook() {
    const name = window.prompt("Nome do novo caderno:", "Novo caderno")?.trim();
    if (!name) return;
    if (name.length > 100) { toast.error("O título não pode ter mais de 100 caracteres."); return; }
    if (library && library.notebooks.length >= 100) { toast.error("Limite de 100 cadernos."); return; }
    const next = createNotebook(name);
    updateLibrary(prev => ({ ...prev, notebooks: [...prev.notebooks, next], activeNotebookId: next.id, activePageId: next.pages[0]!.id }));
    toast.success("Caderno criado.");
    setShowLibrary(false);
  }
  function renameNotebook() {
    if (!notebook) return;
    const name = window.prompt("Nome do caderno:", notebook.title)?.trim();
    if (!name || name.length > 100) return;
    updateNotebook(n => ({ ...n, title: name, updatedAt: Date.now() }));
  }
  function deleteNotebook() {
    if (!notebook || !library) return;
    if (!window.confirm("Eliminar o caderno «" + notebook.title + "» e todas as páginas? Exporta primeiro uma cópia de segurança.")) return;
    if (library.notebooks.length === 1) {
      toast.error("Não podes apagar o último caderno. Cria outro primeiro.");
      return;
    }
    updateLibrary(prev => {
      const others = prev.notebooks.filter(n => n.id !== notebook.id);
      const first = others[0]!;
      return { ...prev, notebooks: others, activeNotebookId: first.id, activePageId: first.pages[0]!.id };
    });
    toast.success("Caderno eliminado.");
  }
  function addPage(duplicate = false) {
    if (!notebook || !page) return;
    if (notebook.pages.length >= 250) { toast.error("Limite de 250 páginas por caderno."); return; }
    const added: NotebookPage = duplicate ? {
      ...page, id: crypto.randomUUID(), title: page.title + " (cópia)",
      strokes: page.strokes.map(s => ({ ...s, points: s.points.map(p => ({ ...p })) })),
      createdAt: Date.now(), updatedAt: Date.now(),
    } : createPage(page.paper);
    updateNotebook(n => {
      const at = n.pages.findIndex(p => p.id === page.id);
      const pages = [...n.pages];
      pages.splice(at + 1, 0, added);
      return { ...n, pages, updatedAt: Date.now() };
    });
    selectPage(added.id);
  }
  function movePage(direction: -1 | 1) {
    if (!notebook || !page) return;
    const at = notebook.pages.findIndex(p => p.id === page.id);
    const target = at + direction;
    if (target < 0 || target >= notebook.pages.length) return;
    updateNotebook(n => {
      const pages = [...n.pages];
      const [moved] = pages.splice(at, 1);
      if (!moved) return n;
      pages.splice(target, 0, moved);
      return { ...n, pages, updatedAt: Date.now() };
    });
  }
  function deletePage() {
    if (!notebook || !page || !window.confirm("Eliminar a página «" + page.title + "»?")) return;
    if (notebook.pages.length === 1) {
      if (!window.confirm("É a última página. Queres limpar a folha e o texto em vez de eliminá-la?")) return;
      updatePage(p => ({ ...p, strokes: [], text: "", updatedAt: Date.now() }));
      delete histories.current[page.id];
      return;
    }
    updateLibrary(prev => {
      const updated = prev.notebooks.map(n => {
        if (n.id !== notebook.id) return n;
        return { ...n, pages: n.pages.filter(p => p.id !== page.id), updatedAt: Date.now() };
      });
      const same = updated.find(n => n.id === notebook.id)!;
      const nextId = same.pages[Math.min(pageIndex, same.pages.length - 1)]!.id;
      return { ...prev, notebooks: updated, activePageId: nextId };
    });
    delete histories.current[page.id];
  }
  function clearPage() {
    if (!page || !page.strokes.length || !window.confirm("Apagar os desenhos desta página? Podes desfazer a operação.")) return;
    commitStrokes([]);
  }
  function exportPage() {
    const source = canvas.current;
    if (!source || !page) return;
    const link = document.createElement("a");
    link.href = source.toDataURL("image/png");
    link.download = "vetestudo-" + page.title.replace(/[^\w\-]+/g, "-").slice(0, 50) + ".png";
    document.body.appendChild(link); link.click(); link.remove();
    toast.success("Página exportada como imagem PNG.");
  }
  function exportBackup() {
    if (!library) return;
    const blob = new Blob([JSON.stringify({ ...library, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = "vetestudo-cadernos-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(link); link.click(); link.remove();
    URL.revokeObjectURL(objectUrl);
    toast.success("Cópia de segurança dos cadernos preparada.");
  }
  async function importBackup(file: File | undefined) {
    if (!file || !library || importBusy) return;
    setImportBusy(true);
    try {
      if (file.size > 15 * 1024 * 1024) throw new Error("Ficheiro demasiado grande. Limite de 15 MB.");
      const parsed = parseLibrary(JSON.parse(await file.text()));
      const merged = mergeLibraries(library, parsed);
      const size = JSON.stringify(merged).length;
      if (size > 4 * 1024 * 1024) throw new Error("Os dados excedem a capacidade recomendada de armazenamento local. Exporta o caderno e remove páginas antigas.");
      if (!window.confirm("Importar " + parsed.notebooks.length + " caderno(s) como cópias adicionais? Os teus cadernos existentes não serão apagados.")) return;
      window.localStorage.setItem(NOTEBOOK_STORAGE_KEY, JSON.stringify(merged));
      setLibrary(merged);
      toast.success("Cadernos importados com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível importar os cadernos.");
    } finally {
      setImportBusy(false);
      if (importRef.current) importRef.current.value = "";
    }
  }
  const filteredPages = notebook?.pages.filter(p => {
    const term = query.trim().toLocaleLowerCase("pt-PT");
    return !term || p.title.toLocaleLowerCase("pt-PT").includes(term) || p.text.toLocaleLowerCase("pt-PT").includes(term);
  }) ?? [];

  if (startupError) return <div className="mx-auto max-w-2xl space-y-4 rounded-2xl border bg-card p-6">
    <h1 className="text-xl font-bold text-destructive">A tua biblioteca de cadernos não pôde ser aberta</h1>
    <p className="text-sm text-muted-foreground">{startupError}</p>
    <p className="text-sm">Por segurança, não substituí os dados existentes. Podes exportar os dados antigos nas ferramentas do navegador antes de tentares recuperar a biblioteca.</p>
  </div>;
  if (!library || !notebook || !page) return <p role="status" className="p-6 text-sm text-muted-foreground">A abrir o teu caderno digital…</p>;

  return <div className="mx-auto max-w-[1680px] space-y-4">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">VetEstudo · Cadernos</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Caderno digital</h1>
        <p className="mt-1 text-sm text-muted-foreground">Apontamentos com Apple Pencil, páginas organizadas e notas de texto.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span role="status" className={"flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium " + (saveError ? "border-destructive/40 text-destructive" : "border-primary/20 text-muted-foreground")}>
          {saveError ? <X size={14}/> : <Save size={14} className="text-primary"/>}
          {saveError ? "Sem guardar" : "Guardado neste dispositivo"}
        </span>
        <Button variant="outline" size="sm" onClick={exportBackup}><Download className="mr-1.5 h-4 w-4"/>Cópia de segurança</Button>
        <input ref={importRef} type="file" accept=".json,application/json" className="sr-only" aria-label="Importar cópia de segurança dos cadernos" onChange={e => void importBackup(e.target.files?.[0])}/>
        <Button variant="outline" size="sm" disabled={importBusy} onClick={() => importRef.current?.click()}><Upload className="mr-1.5 h-4 w-4"/>Importar</Button>
      </div>
    </header>
    {saveError && <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{saveError}</div>}
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-3">
      <div className="flex min-w-0 items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => setShowLibrary(v => !v)}><BookOpen className="mr-1.5 h-4 w-4"/>Cadernos <span className="ml-1 text-xs opacity-70">({library.notebooks.length})</span></Button>
        <ChevronRight size={14} className="shrink-0 text-muted-foreground"/>
        <span className="max-w-[230px] truncate text-sm font-bold">{notebook.title}</span>
        <ChevronRight size={14} className="shrink-0 text-muted-foreground"/>
        <span className="max-w-[180px] truncate text-xs text-muted-foreground">{page.title}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={renameNotebook}><PenLine className="mr-1.5 h-4 w-4"/>Renomear caderno</Button>
        <Button variant="outline" size="sm" onClick={() => setShowPages(v=>!v)}><LayoutList className="mr-1.5 h-4 w-4"/>{showPages ? "Ocultar páginas" : "Ver páginas"}</Button>
        <Button variant="outline" size="sm" onClick={() => setShowNotes(v=>!v)}><Keyboard className="mr-1.5 h-4 w-4"/>{showNotes ? "Ocultar texto" : "Notas de texto"}</Button>
      </div>
    </div>
    {showLibrary && <section className="space-y-3 rounded-2xl border bg-card p-4" aria-label="Biblioteca de cadernos">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">Os meus cadernos</h2><Button size="sm" onClick={addNotebook}><FolderPlus className="mr-1.5 h-4 w-4"/>Novo caderno</Button></div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{library.notebooks.map(item =>
        <button key={item.id} type="button" onClick={() => selectNotebook(item.id)} className={"flex items-center gap-3 rounded-xl border p-3 text-left transition hover:border-primary " + (item.id === notebook.id ? "border-primary bg-primary/10" : "")}>
          <BookOpen className="h-6 w-6 shrink-0 text-primary"/><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{item.title}</span><span className="text-xs text-muted-foreground">{item.pages.length} página(s)</span></span>{item.id === notebook.id && <Check className="h-4 w-4 text-primary"/>}
        </button>)}</div>
      <Button size="sm" variant="outline" className="text-destructive" onClick={deleteNotebook}><Trash2 className="mr-1.5 h-4 w-4"/>Eliminar caderno atual</Button>
    </section>}
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-2xl border bg-card/95 p-3 shadow-md backdrop-blur">
      <div role="group" aria-label="Ferramentas de escrita" className="flex flex-wrap gap-1">
        {([
          ["pen", PenLine, "Caneta"], ["highlighter", Highlighter, "Sublinhador"],
          ["eraser", Eraser, "Borracha de traço"], ["hand", Hand, "Mover folha"],
        ] as const).map(([name, Icon, label]) =>
          <Button type="button" key={name} title={label} aria-label={label} variant={tool === name ? "default" : "outline"} size="sm" onClick={() => { finishStroke(); setTool(name); }}>
            <Icon size={17}/><span className="ml-1 hidden sm:inline">{label}</span>
          </Button>)}
      </div>
      <span aria-hidden="true" className="hidden h-7 border-l sm:block"/>
      <div role="group" aria-label="Cores" className="flex flex-wrap gap-1.5">
        {COLORS.map(c => <button key={c.hex} type="button" title={c.name} aria-label={"Cor " + c.name} aria-pressed={color === c.hex}
          onClick={() => { setColor(c.hex); setTool("pen"); }}
          className={"h-7 w-7 rounded-full border-2 p-0.5 transition " + (color === c.hex ? "border-primary" : "border-transparent")}>
          <span className="block h-full w-full rounded-full border border-black/10" style={{ backgroundColor: c.hex }}/>
        </button>)}
      </div>
      <label className="flex items-center gap-2 text-xs"><span>Traço {width}</span><input type="range" min={1} max={14} value={width} onChange={e => setWidth(Number(e.target.value))} className="w-20 accent-primary" aria-label="Espessura do traço"/></label>
      <label className="flex items-center gap-1.5 rounded-lg border px-2 py-2 text-xs"><input type="checkbox" checked={stylusOnly} onChange={e => setStylusOnly(e.target.checked)} /> Só Pencil</label>
      <div className="ml-auto flex items-center gap-1">
        <Button size="sm" variant="outline" title="Desfazer (Ctrl+Z)" aria-label="Desfazer" disabled={!undoAvailable} onClick={undo}><Undo2 size={17}/></Button>
        <Button size="sm" variant="outline" title="Refazer (Ctrl+Shift+Z)" aria-label="Refazer" disabled={!redoAvailable} onClick={redo}><Redo2 size={17}/></Button>
        <Button size="sm" variant="outline" title="Apagar desenhos desta página" aria-label="Limpar desenhos" disabled={!page.strokes.length} onClick={clearPage}><RotateCcw size={17}/></Button>
      </div>
    </div>
    <div className="grid items-start gap-4 xl:grid-cols-[215px_minmax(0,1fr)_285px]">
      {showPages && <aside className="space-y-3 rounded-2xl border bg-card p-3 xl:sticky xl:top-24" aria-label="Páginas do caderno">
        <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-bold">Páginas ({notebook.pages.length})</h2><Button size="sm" variant="outline" onClick={() => addPage()}><FilePlus2 size={16}/></Button></div>
        <div className="relative"><Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground"/><Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Procurar página..." aria-label="Pesquisar páginas" className="h-9 pl-8 text-xs"/></div>
        <div className="flex max-h-[55vh] gap-2 overflow-auto xl:flex-col">{filteredPages.map(p => {
          const number = notebook.pages.findIndex(x => x.id === p.id) + 1;
          return <div key={p.id} className="w-[180px] shrink-0 xl:w-auto">
            <PageThumbnail page={p} number={number} selected={p.id === page.id} onClick={() => selectPage(p.id)}/>
          </div>;
        })}</div>
        {!filteredPages.length && <p className="text-xs text-muted-foreground">Nenhuma página corresponde à pesquisa.</p>}
        <Button size="sm" onClick={() => addPage()} className="w-full"><Plus className="mr-1.5 h-4 w-4"/>Nova página</Button>
      </aside>}
      <section className="min-w-0 space-y-3" aria-labelledby="folha-caderno">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2">
          <div className="min-w-0 flex-1"><h2 id="folha-caderno" className="truncate text-sm font-bold">{page.title}</h2><p className="text-xs text-muted-foreground">Folha {pageIndex + 1} de {notebook.pages.length} · {PAPER_LABELS[page.paper]}</p></div>
          <div className="flex flex-wrap items-center gap-1">
            <Button size="sm" variant="outline" onClick={() => setZoom(z=>Math.max(65,z-15))} disabled={zoom===65} aria-label="Reduzir zoom"><ZoomOut size={17}/></Button>
            <span className="min-w-[45px] text-center text-xs tabular-nums">{zoom}%</span>
            <Button size="sm" variant="outline" onClick={() => setZoom(z=>Math.min(200,z+15))} disabled={zoom===200} aria-label="Aumentar zoom"><ZoomIn size={17}/></Button>
            <Button size="sm" variant="ghost" onClick={() => setZoom(100)} aria-label="Repor zoom"><RotateCcw size={15}/></Button>
          </div>
        </div>
        <div ref={workspace} className="max-h-[79vh] min-h-[340px] overflow-auto rounded-2xl border bg-slate-200 p-3 sm:p-5">
          <div className="mx-auto" style={{ width: `${zoom}%`, maxWidth: "none", minWidth: 260 }}>
            <canvas ref={canvas} width={PAGE_WIDTH * RESOLUTION} height={PAGE_HEIGHT * RESOLUTION} aria-label="Folha para escrita manual" tabIndex={0}
              onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={finishStroke}
              onPointerCancel={finishStroke} onLostPointerCapture={finishStroke}
              className="block w-full bg-white shadow-xl"
              style={{ touchAction: tool === "hand" ? "pan-x pan-y" : "none", userSelect: "none", WebkitUserSelect: "none" }}/>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" disabled={pageIndex === 0} onClick={() => selectPage(notebook.pages[pageIndex - 1]!.id)}><ChevronLeft className="mr-1 h-4 w-4"/>Anterior</Button>
            <span className="min-w-16 text-center text-xs font-semibold">{pageIndex + 1} / {notebook.pages.length}</span>
            <Button size="sm" variant="outline" disabled={pageIndex >= notebook.pages.length - 1} onClick={() => selectPage(notebook.pages[pageIndex + 1]!.id)}>Seguinte<ChevronRight className="ml-1 h-4 w-4"/></Button>
            <Button size="sm" onClick={() => addPage()}><Plus className="mr-1 h-4 w-4"/>Página</Button>
          </div>
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant="outline" title="Mover página para cima" aria-label="Mover página para cima" disabled={pageIndex===0} onClick={() => movePage(-1)}><ArrowUp size={16}/></Button>
            <Button size="sm" variant="outline" title="Mover página para baixo" aria-label="Mover página para baixo" disabled={pageIndex===notebook.pages.length-1} onClick={() => movePage(1)}><ArrowDown size={16}/></Button>
            <Button size="sm" variant="outline" onClick={() => addPage(true)}><Copy className="mr-1 h-4 w-4"/>Duplicar</Button>
            <Button size="sm" variant="outline" onClick={exportPage}><FileImage className="mr-1 h-4 w-4"/>PNG</Button>
            <Button size="sm" variant="outline" className="text-destructive" onClick={deletePage} aria-label="Eliminar página"><Trash2 size={16}/></Button>
          </div>
        </div>
      </section>
      {showNotes && <aside className="space-y-4 rounded-2xl border bg-card p-4 xl:sticky xl:top-24" aria-label="Informações e texto da página">
        <div className="space-y-2"><h2 className="flex items-center gap-2 text-sm font-bold"><NotebookPen size={18} className="text-primary"/> Página e apontamentos</h2>
          <label className="block text-xs text-muted-foreground" htmlFor="notebook-page-title">Título da página</label>
          <Input id="notebook-page-title" value={page.title} maxLength={100} onChange={e=>updatePage(p=>({...p,title:e.target.value,updatedAt:Date.now()}))} placeholder="Ex.: Sistema cardiovascular"/>
        </div>
        <div className="space-y-2"><label htmlFor="notebook-paper" className="text-xs text-muted-foreground">Tipo de papel</label>
          <select id="notebook-paper" value={page.paper} onChange={e=>updatePage(p=>({...p,paper:e.target.value as Paper,updatedAt:Date.now()}))}
            className="block h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground">
            {(Object.keys(PAPER_LABELS) as Paper[]).map(key=><option key={key} value={key}>{PAPER_LABELS[key]}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="notebook-text-notes" className="flex items-center gap-2 text-xs font-bold text-foreground"><Keyboard size={16} className="text-primary"/> Notas de texto</label>
          <Textarea id="notebook-text-notes" value={page.text} maxLength={100000}
            onChange={e=>updatePage(p=>({...p,text:e.target.value,updatedAt:Date.now()}))}
            placeholder="Escreve aqui os conceitos-chave, resumos e apontamentos desta página…"
            className="min-h-48 resize-y text-sm leading-relaxed"/>
          <p className="text-[11px] leading-relaxed text-muted-foreground">O texto é guardado e pesquisável no caderno, mas não aparece na exportação da folha PNG.</p>
        </div>
        <div className="space-y-2 border-t pt-3">
          <p className="flex items-center gap-2 text-xs font-semibold"><ShieldCheck size={16} className="text-primary"/> Privacidade e segurança</p>
          <p className="text-xs leading-relaxed text-muted-foreground">Os cadernos ficam neste navegador e não são sincronizados. Exporta periodicamente uma cópia de segurança JSON.</p>
        </div>
      </aside>}
    </div>
    <p className="text-xs leading-relaxed text-muted-foreground">
      <strong>Dica para iPad:</strong> ativa «Só Pencil» para ignorar toques acidentais na escrita. Escolhe «Mover folha» para deslocar o papel com os dedos; a borracha elimina traços inteiros e permite desfazer.
      Os cadernos antigos são importados sem apagar o armazenamento original. O ficheiro JSON inclui desenhos e notas de texto.
    </p>
  </div>;
}
