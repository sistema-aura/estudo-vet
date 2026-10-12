import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { toast } from "sonner";
import { ArrowDownToLine, Bookmark, Check, ChevronLeft, ChevronRight, Download, Eraser, FileImage, Highlighter, Maximize2, PenLine, Redo2, RotateCcw, Search, Undo2, X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Stroke = { points: [number, number][]; color: string; width: number; opacity?: number };
type Ink = Record<string, Stroke[]>;
type Hit = { page: number; context: string };
type Mode = "scroll" | "pen" | "highlighter" | "eraser";
const PALETTE = [
  { label: "Vermelho", color: "#dc2626" },
  { label: "Azul", color: "#2563eb" },
  { label: "Verde", color: "#16a34a" },
  { label: "Preto", color: "#171717" },
];
function searchText(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-PT");
}
function safelyReadInk(key: string): Ink {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Ink;
  } catch { return {}; }
}
function pathFor(stroke: Stroke): string {
  return stroke.points.map(([x, y], index) => (index ? "L" : "M") + x + " " + y).join(" ");
}

export function PdfReader({ url, materialId }: { url: string; materialId?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const viewer = useRef<HTMLDivElement>(null);
  const inkRef = useRef<Ink>({});
  const activeStroke = useRef<Stroke | null>(null);
  const redoRef = useRef<Record<string, Stroke[]>>({});
  const textCache = useRef<Map<number, string>>(new Map());
  const searchToken = useRef(0);

  const [pdf, setPdf] = useState<import("pdfjs-dist").PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [pageDraft, setPageDraft] = useState("1");
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [viewerWidth, setViewerWidth] = useState(700);
  const [mode, setMode] = useState<Mode>("scroll");
  const [penColor, setPenColor] = useState(PALETTE[0]!.color);
  const [ink, setInk] = useState<Ink>({});
  const [redo, setRedo] = useState<Record<string, Stroke[]>>({});
  const [active, setActive] = useState<Stroke | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);

  const inkKey = "vetestudo-pdf-ink-" + (materialId ?? url.split("?")[0]);
  const progressKey = "vetestudo-pdf-progress-" + (materialId ?? url.split("?")[0]);
  const currentInk = ink[String(page)] ?? [];
  const currentRedo = redo[String(page)] ?? [];

  useEffect(() => {
    const saved = safelyReadInk(inkKey);
    inkRef.current = saved;
    redoRef.current = {};
    setInk(saved);
    setRedo({});
  }, [inkKey]);

  useEffect(() => {
    const element = viewer.current;
    if (!element) return;
    const measure = () => setViewerWidth(Math.max(260, element.clientWidth - 16));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [pdf]);

  function storeInk(next: Ink) {
    inkRef.current = next;
    setInk(next);
    try { window.localStorage.setItem(inkKey, JSON.stringify(next)); }
    catch { toast.error("Sem espaço para guardar as anotações neste dispositivo. Exporta uma cópia de segurança."); }
  }
  function resetRedo(): void {
    redoRef.current = { ...redoRef.current, [String(page)]: [] };
    setRedo(redoRef.current);
  }
  function nextPage(value: number) {
    if (!pdf) return;
    const next = Math.min(pdf.numPages, Math.max(1, Math.trunc(value) || 1));
    if (activeStroke.current) finishStroke();
    setPage(next);
    setPageDraft(String(next));
    viewer.current?.scrollTo({ top: 0, behavior: "instant" });
    try { window.localStorage.setItem(progressKey, String(next)); } catch { /* Optional storage */ }
  }
  function finishStroke() {
    const stroke = activeStroke.current;
    if (!stroke) return;
    activeStroke.current = null;
    const key = String(page);
    storeInk({ ...inkRef.current, [key]: [...(inkRef.current[key] ?? []), stroke] });
    resetRedo();
    setActive(null);
  }
  function position(event: ReactPointerEvent<SVGSVGElement>): [number, number] {
    const rect = event.currentTarget.getBoundingClientRect();
    return [
      Math.max(0, Math.min(1000, (event.clientX - rect.left) * 1000 / rect.width)),
      Math.max(0, Math.min(1000, (event.clientY - rect.top) * 1000 / rect.height)),
    ];
  }
  function pointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (mode === "scroll") return;
    event.preventDefault();
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Unsupported pointer capture */ }
    const point = position(event);
    if (mode === "eraser") {
      const key = String(page);
      const filtered = (inkRef.current[key] ?? []).filter(stroke => !stroke.points.some(([x, y]) => Math.hypot(x - point[0], y - point[1]) < 24));
      if (filtered.length !== (inkRef.current[key] ?? []).length) {
        storeInk({ ...inkRef.current, [key]: filtered });
        resetRedo();
      }
      return;
    }
    const stroke: Stroke = {
      points: [point],
      color: mode === "highlighter" ? "#facc15" : penColor,
      width: mode === "highlighter" ? 23 : 3.2,
      opacity: mode === "highlighter" ? 0.38 : 1,
    };
    activeStroke.current = stroke;
    setActive(stroke);
  }
  function pointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const stroke = activeStroke.current;
    if (!stroke) return;
    event.preventDefault();
    const point = position(event);
    const last = stroke.points[stroke.points.length - 1];
    if (last && Math.hypot(last[0] - point[0], last[1] - point[1]) < 1) return;
    const next = { ...stroke, points: [...stroke.points, point] };
    activeStroke.current = next;
    setActive(next);
  }
  function undo() {
    const key = String(page);
    const strokes = inkRef.current[key] ?? [];
    const last = strokes.at(-1);
    if (!last) return;
    redoRef.current = { ...redoRef.current, [key]: [...(redoRef.current[key] ?? []), last] };
    setRedo(redoRef.current);
    storeInk({ ...inkRef.current, [key]: strokes.slice(0, -1) });
  }
  function redoStroke() {
    const key = String(page);
    const available = redoRef.current[key] ?? [];
    const last = available.at(-1);
    if (!last) return;
    redoRef.current = { ...redoRef.current, [key]: available.slice(0, -1) };
    setRedo(redoRef.current);
    storeInk({ ...inkRef.current, [key]: [...(inkRef.current[key] ?? []), last] });
  }
  function clearPage() {
    if (!currentInk.length || !window.confirm("Apagar todas as marcações desta página?")) return;
    redoRef.current = { ...redoRef.current, [String(page)]: currentInk };
    setRedo(redoRef.current);
    storeInk({ ...inkRef.current, [String(page)]: [] });
    toast.success("Marcações desta página apagadas. Podes usar Refazer.");
  }
  function exportAnnotations() {
    const data = JSON.stringify({ version: 1, materialId: materialId ?? null, exportedAt: new Date().toISOString(), pages: inkRef.current }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl; link.download = "vetestudo-marcacoes-" + (materialId || "pdf") + ".json";
    document.body.appendChild(link); link.click(); link.remove();
    URL.revokeObjectURL(blobUrl);
    toast.success("Cópia das marcações preparada.");
  }
  function exportPageImage() {
    const source = canvas.current;
    if (!source || !pdf) return;
    const output = document.createElement("canvas");
    output.width = source.width;
    output.height = source.height;
    const ctx = output.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(source, 0, 0);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (const stroke of inkRef.current[String(page)] ?? []) {
      ctx.globalAlpha = stroke.opacity ?? 1;
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineWidth = stroke.width / 1000 * output.width;
      ctx.beginPath();
      stroke.points.forEach(([x, y], index) => {
        const px = x / 1000 * output.width, py = y / 1000 * output.height;
        if (index) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      });
      if (stroke.points.length === 1) {
        const [x, y] = stroke.points[0]!;
        ctx.arc(x / 1000 * output.width, y / 1000 * output.height, ctx.lineWidth / 2, 0, 2 * Math.PI);
        ctx.fill();
      } else ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const link = document.createElement("a");
    link.href = output.toDataURL("image/png");
    link.download = "vetestudo-pagina-" + page + ".png";
    document.body.appendChild(link); link.click(); link.remove();
    toast.success("Página exportada em PNG com as marcações.");
  }
  async function findInDocument() {
    const text = searchText(searchQuery.trim());
    const token = ++searchToken.current;
    setHits([]);
    setSearchProgress("");
    if (!pdf || text.length < 2) { setSearchProgress("Escreve pelo menos 2 caracteres."); return; }
    setSearching(true);
    const result: Hit[] = [];
    try {
      for (let p = 1; p <= pdf.numPages; p++) {
        if (token !== searchToken.current) return;
        let contents = textCache.current.get(p);
        if (contents === undefined) {
          const pdfPage = await pdf.getPage(p);
          const extracted = await pdfPage.getTextContent();
          contents = extracted.items.map(item => "str" in item ? item.str : "").join(" ");
          textCache.current.set(p, contents);
        }
        const offset = searchText(contents).indexOf(text);
        if (offset >= 0) {
          result.push({ page: p, context: contents.slice(Math.max(0, offset - 55), offset + text.length + 70).trim() });
        }
        if (p % 8 === 0 || p === pdf.numPages) setSearchProgress("A pesquisar: " + p + "/" + pdf.numPages + " páginas");
        if (result.length >= 100) break;
      }
      if (token !== searchToken.current) return;
      setHits(result);
      setSearchProgress(result.length ? result.length + " página(s) encontradas" + (result.length >= 100 ? " (primeiros 100 resultados)" : "") : "Nenhum resultado. Um PDF digitalizado pode não conter texto pesquisável.");
    } catch { if (token === searchToken.current) setSearchProgress("A pesquisa não pôde ser concluída neste documento."); }
    finally { if (token === searchToken.current) setSearching(false); }
  }

  useEffect(() => {
    let cancelled = false;
    let task: import("pdfjs-dist").PDFDocumentLoadingTask | undefined;
    setPdf(null);
    setError("");
    setLoading(true);
    setPage(1);
    setPageDraft("1");
    setZoom(100);
    setHits([]);
    setSearchProgress("");
    textCache.current.clear();
    searchToken.current++;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        task = pdfjs.getDocument({ url });
        const doc = await task.promise;
        if (cancelled) { await doc.destroy(); return; }
        const lastPage = (() => {
          try { return Number(window.localStorage.getItem(progressKey) || 1); } catch { return 1; }
        })();
        const start = Number.isFinite(lastPage) ? Math.max(1, Math.min(doc.numPages, Math.trunc(lastPage))) : 1;
        setPdf(doc);
        setPage(start);
        setPageDraft(String(start));
        setLoading(false);
      } catch (caught) {
        if (!cancelled) { setError(caught instanceof Error ? caught.message : "Não foi possível abrir este PDF."); setLoading(false); }
      }
    })();
    return () => { cancelled = true; searchToken.current++; void task?.destroy(); };
  }, [url, retry, progressKey]);

  useEffect(() => {
    if (!pdf || !canvas.current) return;
    let cancelled = false;
    let task: import("pdfjs-dist").RenderTask | undefined;
    setRendering(true);
    (async () => {
      try {
        const pdfPage = await pdf.getPage(page);
        if (cancelled || !canvas.current) return;
        const base = pdfPage.getViewport({ scale: 1 });
        const cssScale = Math.max(260, viewerWidth) / base.width * zoom / 100;
        const ratio = Math.min(window.devicePixelRatio || 1, 2.5);
        const viewport = pdfPage.getViewport({ scale: cssScale * ratio });
        const target = canvas.current;
        target.width = Math.ceil(viewport.width);
        target.height = Math.ceil(viewport.height);
        target.style.width = Math.ceil(base.width * cssScale) + "px";
        target.style.height = Math.ceil(base.height * cssScale) + "px";
        const context = target.getContext("2d");
        if (!context) return;
        task = pdfPage.render({ canvas: target, canvasContext: context, viewport });
        await task.promise;
        if (!cancelled) { setError(""); setRendering(false); }
      } catch (caught) {
        if (!cancelled) {
          setRendering(false);
          if (!(caught instanceof Error && caught.name === "RenderingCancelledException")) setError("Não foi possível apresentar esta página do PDF.");
        }
      }
    })();
    return () => { cancelled = true; task?.cancel(); };
  }, [pdf, page, zoom, viewerWidth]);

  return <div className="min-w-0 space-y-3 rounded-2xl border bg-card p-3 sm:p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="sm" variant="outline" disabled={!pdf || page <= 1} onClick={() => nextPage(page - 1)} aria-label="Página anterior"><ChevronLeft size={17}/></Button>
        <form onSubmit={event => { event.preventDefault(); nextPage(Number(pageDraft)); }} className="flex items-center gap-1.5 text-xs sm:text-sm">
          <label htmlFor="pdf-page-number">Página</label>
          <Input id="pdf-page-number" type="number" min={1} max={pdf?.numPages || 1} value={pageDraft} onChange={event => setPageDraft(event.target.value)} className="h-8 w-16 text-center text-sm" disabled={!pdf}/>
          <span className="text-muted-foreground">/ {pdf?.numPages ?? "—"}</span>
          <Button size="sm" type="submit" variant="ghost" disabled={!pdf} aria-label="Ir para a página">Ir</Button>
        </form>
        <Button size="sm" variant="outline" disabled={!pdf || page >= pdf.numPages} onClick={() => nextPage(page + 1)} aria-label="Página seguinte"><ChevronRight size={17}/></Button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="sm" variant="outline" disabled={zoom <= 75} onClick={() => setZoom(value => Math.max(75, value - 25))} aria-label="Reduzir zoom"><ZoomOut size={16}/></Button>
        <span className="min-w-12 text-center text-xs tabular-nums">{zoom}%</span>
        <Button size="sm" variant="outline" disabled={zoom >= 250} onClick={() => setZoom(value => Math.min(250, value + 25))} aria-label="Aumentar zoom"><ZoomIn size={16}/></Button>
        <Button size="sm" variant="outline" disabled={zoom === 100} onClick={() => setZoom(100)} aria-label="Repor zoom"><Maximize2 size={16}/></Button>
        <Button size="sm" variant={showSearch ? "default" : "outline"} onClick={() => setShowSearch(value => !value)}><Search className="mr-1.5 h-4 w-4"/>Pesquisar</Button>
      </div>
    </div>

    {showSearch && <div className="space-y-2 rounded-xl border bg-muted/25 p-3">
      <form className="flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); void findInDocument(); }}>
        <Input aria-label="Pesquisar dentro do PDF" className="min-w-40 flex-1" placeholder="Encontrar palavras dentro do PDF…" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} />
        <Button type="submit" disabled={!pdf || searching || searchQuery.trim().length < 2}><Search className="mr-1.5 h-4 w-4"/> {searching ? "A procurar…" : "Procurar"}</Button>
        <Button type="button" variant="ghost" onClick={() => { searchToken.current++; setSearching(false); setShowSearch(false); setHits([]); setSearchProgress(""); }} aria-label="Fechar pesquisa"><X size={17}/></Button>
      </form>
      {searchProgress && <p role="status" className="text-xs text-muted-foreground">{searchProgress}</p>}
      {hits.length > 0 && <div className="max-h-52 space-y-1.5 overflow-y-auto">{hits.map(hit => <button key={hit.page} type="button" onClick={() => nextPage(hit.page)} className="flex w-full items-start gap-3 rounded-lg border bg-card p-2.5 text-left text-xs transition hover:border-primary"><span className="shrink-0 font-bold text-primary">Pág. {hit.page}</span><span className="line-clamp-2 text-muted-foreground">{hit.context}</span></button>)}</div>}
      <p className="text-xs text-muted-foreground">A pesquisa identifica páginas que contêm o termo; não aplica destaques sobre o texto. PDFs digitalizados podem exigir OCR.</p>
    </div>}

    <div className="flex flex-wrap items-center justify-between gap-2 border-y py-2">
      <div role="group" aria-label="Ferramentas de anotação" className="flex flex-wrap items-center gap-1">
        <Button size="sm" variant={mode === "scroll" ? "default" : "outline"} onClick={() => { finishStroke(); setMode("scroll"); }}><Bookmark className="mr-1.5 h-4 w-4"/>Mover</Button>
        <Button size="sm" variant={mode === "pen" ? "default" : "outline"} onClick={() => setMode("pen")}><PenLine className="mr-1.5 h-4 w-4"/>Caneta</Button>
        <Button size="sm" variant={mode === "highlighter" ? "default" : "outline"} onClick={() => setMode("highlighter")}><Highlighter className="mr-1.5 h-4 w-4"/>Sublinhar</Button>
        <Button size="sm" variant={mode === "eraser" ? "default" : "outline"} onClick={() => setMode("eraser")}><Eraser className="mr-1.5 h-4 w-4"/>Borracha</Button>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {mode === "pen" && PALETTE.map(color => <button type="button" key={color.color} aria-label={"Cor da caneta: " + color.label} aria-pressed={penColor === color.color} onClick={() => setPenColor(color.color)} className={"h-7 w-7 rounded-full border-2 p-0.5 " + (penColor === color.color ? "border-primary" : "border-transparent")}><span className="block h-full w-full rounded-full" style={{ backgroundColor: color.color }}/></button>)}
        <Button size="sm" variant="outline" disabled={!currentInk.length} onClick={undo} title="Desfazer"><Undo2 size={16}/></Button>
        <Button size="sm" variant="outline" disabled={!currentRedo.length} onClick={redoStroke} title="Refazer"><Redo2 size={16}/></Button>
        <Button size="sm" variant="outline" disabled={!currentInk.length} onClick={clearPage} title="Apagar marcações desta página"><RotateCcw size={16}/></Button>
      </div>
    </div>

    {loading && <p role="status" className="rounded-xl bg-muted p-5 text-sm text-muted-foreground">A preparar o PDF…</p>}
    {error && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm"><span className="min-w-0 flex-1 text-destructive">{error}</span><Button size="sm" variant="outline" onClick={() => setRetry(n => n + 1)}>Tentar novamente</Button><a href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline">Abrir original</a></div>}
    {pdf && <div ref={viewer} className="relative max-h-[77vh] min-h-[320px] overflow-auto rounded-xl border bg-slate-200 p-2" aria-label={"Leitor PDF: página " + page + " de " + pdf.numPages}>
      <div className="relative mx-auto w-fit bg-white shadow-lg">
        <canvas ref={canvas} className="block max-w-none" aria-label={"Página " + page + " do PDF"}/>
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" role="img" aria-label="Marcações manuscritas sobre a página"
          className="absolute inset-0 h-full w-full" style={{ touchAction: mode === "scroll" ? "auto" : "none", pointerEvents: mode === "scroll" ? "none" : "auto" }}
          onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={finishStroke} onPointerCancel={finishStroke} onLostPointerCapture={finishStroke}>
          {[...currentInk, ...(active ? [active] : [])].map((stroke, index) =>
            stroke.points.length === 1 && stroke.points[0] ? <circle key={index} cx={stroke.points[0][0]} cy={stroke.points[0][1]} r={stroke.width / 2} fill={stroke.color} opacity={stroke.opacity ?? 1} />
              : <path key={index} d={pathFor(stroke)} stroke={stroke.color} opacity={stroke.opacity ?? 1} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          )}
        </svg>
      </div>
      {rendering && <div className="pointer-events-none sticky bottom-2 mx-auto w-fit rounded-lg bg-slate-900/80 px-3 py-1 text-xs text-white">A apresentar página…</div>}
    </div>}

    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="max-w-lg text-xs leading-relaxed text-muted-foreground">O leitor recorda a última página. Usa Caneta ou Sublinhar com o Apple Pencil; escolhe Mover para navegar. As marcações ficam guardadas neste navegador.</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={!pdf} onClick={exportPageImage}><FileImage className="mr-1.5 h-4 w-4"/>Página PNG</Button>
        <Button size="sm" variant="outline" disabled={!Object.values(ink).some(v => v.length)} onClick={exportAnnotations}><Download className="mr-1.5 h-4 w-4"/>Exportar marcações</Button>
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium text-primary transition hover:bg-muted"><ArrowDownToLine size={16}/> PDF original</a>
      </div>
    </div>
    <p className="text-[11px] text-muted-foreground">A exportação PNG inclui as marcações da página visível. «Exportar marcações» guarda um ficheiro JSON de segurança; não modifica o PDF original.</p>
  </div>;
}
