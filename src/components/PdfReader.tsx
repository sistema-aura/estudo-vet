import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Stroke = { points: [number, number][]; color: string; width: number };
type Ink = Record<string, Stroke[]>;
export function PdfReader({ url, materialId }: { url: string; materialId?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<import("pdfjs-dist").PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [inkMode, setInkMode] = useState<"scroll" | "pen" | "eraser">("scroll");
  const [ink, setInk] = useState<Ink>({});
  const [active, setActive] = useState<Stroke | null>(null);
  const inkKey = `vetestudo-pdf-ink-${materialId ?? url.split("?")[0]}`;
  useEffect(() => {
    try { const stored = JSON.parse(localStorage.getItem(inkKey) || "{}"); setInk(stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {}); }
    catch { setInk({}); }
  }, [inkKey]);
  function saveInk(next: Ink) {
    setInk(next);
    try { localStorage.setItem(inkKey, JSON.stringify(next)); }
    catch { setError("Não foi possível guardar as anotações neste dispositivo."); }
  }
  function position(e: React.PointerEvent<SVGSVGElement>): [number, number] {
    const rect = e.currentTarget.getBoundingClientRect();
    return [Math.max(0, Math.min(1000, (e.clientX - rect.left) * 1000 / rect.width)), Math.max(0, Math.min(1000, (e.clientY - rect.top) * 1000 / rect.height))];
  }
  function inkDown(e: React.PointerEvent<SVGSVGElement>) {
    if (inkMode === "scroll") return;
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    const pt = position(e);
    if (inkMode === "eraser") {
      const strokes = ink[String(page)] ?? [];
      const next = strokes.filter(s => !s.points.some(([x,y]) => Math.hypot(x - pt[0], y - pt[1]) < 22));
      saveInk({ ...ink, [page]: next });
    } else setActive({ points: [pt], color: "#e11d48", width: 3 });
  }
  function inkMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!active) return;
    e.preventDefault();
    setActive(s => s ? { ...s, points: [...s.points, position(e)] } : null);
  }
  function inkUp() {
    if (!active) return;
    saveInk({ ...ink, [page]: [...(ink[String(page)] ?? []), active] });
    setActive(null);
  }
  const pathFor = (s: Stroke) => s.points.map(([x,y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
  
  useEffect(() => {
    let cancelled = false;
    let task: import("pdfjs-dist").PDFDocumentLoadingTask | undefined;
    setPdf(null); setPage(1); setZoom(100); setError(""); setLoading(true);
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        task = pdfjs.getDocument({ url });
        const doc = await task.promise;
        if (!cancelled) { setPdf(doc); setLoading(false); }
        else await doc.destroy();
      } catch (e) { if (!cancelled) { setError(e instanceof Error ? e.message : "Erro ao abrir PDF"); setLoading(false); } }
    })();
    return () => { cancelled = true; void task?.destroy(); };
  }, [url]);
  useEffect(() => {
    if (!pdf || !canvas.current) return;
    let cancelled = false;
    let render: import("pdfjs-dist").RenderTask | undefined;
    (async () => {
      try {
        const p = await pdf.getPage(page);
        if (cancelled || !canvas.current) return;
        const base = p.getViewport({ scale: 1 });
        const width = Math.max(300, canvas.current.parentElement?.clientWidth ?? 700);
        const cssScale = (width / base.width) * zoom / 100;
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
        const viewport = p.getViewport({ scale: cssScale * pixelRatio });
        const el = canvas.current;
        el.width = Math.ceil(viewport.width); el.height = Math.ceil(viewport.height);
        el.style.width = `${Math.ceil(base.width * cssScale)}px`;
        el.style.height = `${Math.ceil(base.height * cssScale)}px`;
        const ctx = el.getContext("2d");
        if (!ctx) return;
        render = p.render({ canvas: el, canvasContext: ctx, viewport });
        await render.promise;
      } catch (e) {
        if (!cancelled && !(e instanceof Error && e.name === "RenderingCancelledException")) setError("Não foi possível apresentar esta página.");
      }
    })();
    return () => { cancelled = true; render?.cancel(); };
  }, [pdf, page, zoom]);
  return <div className="min-w-0 rounded-2xl border bg-card p-3">
    {loading && <p className="p-5 text-sm">A abrir todas as páginas do PDF…</p>}
    {error && <p role="alert" className="p-4 text-sm text-destructive">{error} <a className="underline" href={url} target="_blank" rel="noreferrer">Abrir ficheiro original</a></p>}
    {pdf && <><div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</Button>
      <span className="text-sm">Página {page} de {pdf.numPages}</span>
      <Button variant="outline" size="sm" disabled={page >= pdf.numPages} onClick={() => setPage(p => Math.min(pdf.numPages, p + 1))}>Seguinte</Button></div>
      <div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={zoom <= 75} onClick={() => setZoom(z => Math.max(75, z - 25))} aria-label="Reduzir zoom">−</Button><span className="min-w-12 text-center text-sm">{zoom}%</span><Button variant="outline" size="sm" disabled={zoom >= 200} onClick={() => setZoom(z => Math.min(200, z + 25))} aria-label="Aumentar zoom">+</Button></div>
      <div className="flex flex-wrap items-center gap-1">
        <Button size="sm" variant={inkMode === "scroll" ? "default" : "outline"} onClick={() => { inkUp(); setInkMode("scroll"); }}>Mover</Button>
        <Button size="sm" variant={inkMode === "pen" ? "default" : "outline"} onClick={() => setInkMode("pen")}>Caneta</Button>
        <Button size="sm" variant={inkMode === "eraser" ? "default" : "outline"} onClick={() => setInkMode("eraser")}>Borracha</Button>
        <Button size="sm" variant="outline" disabled={!(ink[String(page)]?.length)} onClick={() => saveInk({ ...ink, [page]: (ink[String(page)] ?? []).slice(0, -1) })}>Desfazer</Button>
      </div>
      <a href={url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">Abrir PDF original</a>
    </div><p className="mb-2 text-xs text-muted-foreground">Escreve sobre o PDF com o Apple Pencil. Os traços são guardados neste navegador, separados por página. Para deslocar o documento, escolhe Mover.</p>
    <div className="max-h-[76vh] overflow-auto rounded-lg bg-slate-100">
      <div className="relative mx-auto w-fit bg-white shadow">
        <canvas ref={canvas} className="block max-w-none" />
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label="Anotações sobre o PDF"
          className="absolute inset-0 h-full w-full" style={{ touchAction: inkMode === "scroll" ? "auto" : "none", pointerEvents: inkMode === "scroll" ? "none" : "auto" }}
          onPointerDown={inkDown} onPointerMove={inkMove} onPointerUp={inkUp} onPointerCancel={inkUp} onLostPointerCapture={inkUp}>
          {[...(ink[String(page)] ?? []), ...(active ? [active] : [])].map((s,i) =>
            s.points.length === 1
              ? <circle key={i} cx={s.points[0][0]} cy={s.points[0][1]} r={s.width / 2} fill={s.color} />
              : <path key={i} d={pathFor(s)} fill="none" stroke={s.color} strokeWidth={s.width} strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      </div>
    </div></>}
  </div>;
}
