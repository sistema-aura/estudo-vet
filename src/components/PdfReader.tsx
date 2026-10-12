import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function PdfReader({ url }: { url: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<import("pdfjs-dist").PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(100);
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
      <a href={url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">Abrir PDF original</a>
    </div><div className="max-h-[76vh] overflow-auto rounded-lg bg-slate-100"><canvas ref={canvas} className="mx-auto max-w-none bg-white shadow" /></div></>}
  </div>;
}
