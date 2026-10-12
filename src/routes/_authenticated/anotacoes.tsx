import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Eraser, Hand, Highlighter, Minus, Pen, Plus, Redo2, RotateCcw, Save, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/anotacoes")({
  head: () => ({ meta: [{ title: "Caderno digital — VetEstudo" }] }),
  component: Anotacoes,
});
type Tool = "pen" | "highlighter" | "eraser" | "hand";
type Stroke = { points: { x: number; y: number }[]; color: string; width: number; tool: Tool };
type Page = { strokes: Stroke[] };
const COLORS = ["#063b3b", "#159c74", "#2563eb", "#dc2626", "#7c3aed", "#f59e0b", "#111827"];
const KEY = "vetestudo-caderno-v1";
const W = 1000, H = 1414;
function readPages(): Page[] {
  if (typeof window === "undefined") return [{ strokes: [] }];
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "");
    if (Array.isArray(saved) && saved.every(p => Array.isArray(p.strokes))) return saved.length ? saved : [{ strokes: [] }];
  } catch {}
  return [{ strokes: [] }];
}
function draw(ctx: CanvasRenderingContext2D, strokes: Stroke[], active?: Stroke) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#e9eef0"; ctx.lineWidth = 1;
  for (let y = 70; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(45, y); ctx.lineTo(W - 45, y); ctx.stroke(); }
  for (const s of [...strokes, ...(active ? [active] : [])]) {
    if (!s.points.length) continue;
    ctx.save();
    ctx.globalCompositeOperation = s.tool === "eraser" ? "destination-out" : "source-over";
    ctx.globalAlpha = s.tool === "highlighter" ? 0.32 : 1;
    ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = s.width;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(s.points[0].x, s.points[0].y);
    if (s.points.length === 1) { ctx.arc(s.points[0].x, s.points[0].y, s.width / 2, 0, Math.PI * 2); ctx.fill(); }
    else { for (const p of s.points.slice(1)) ctx.lineTo(p.x, p.y); ctx.stroke(); }
    ctx.restore();
  }
}
function Anotacoes() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const active = useRef<Stroke | null>(null);
  const [pages, setPages] = useState<Page[]>(readPages);
  const [page, setPage] = useState(0);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(4);
  const [stylusOnly, setStylusOnly] = useState(false);
  const [redo, setRedo] = useState<Stroke[]>([]);
  const [zoom, setZoom] = useState(100);
  const [title, setTitle] = useState("O meu caderno");
  const current = pages[page]?.strokes ?? [];
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx) draw(ctx, current, active.current ?? undefined);
  }, [pages, page]);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(pages)); } catch { toast.error("Sem espaço para guardar o caderno neste dispositivo."); }
  }, [pages]);
  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * W / rect.width, y: (e.clientY - rect.top) * H / rect.height };
  }
  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    if (tool === "hand" || (stylusOnly && e.pointerType !== "pen")) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    active.current = { points: [point(e)], color, width: tool === "highlighter" ? width * 5 : tool === "eraser" ? width * 6 : width, tool };
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!active.current) return;
    e.preventDefault();
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    for (const event of events) active.current.points.push(point(event as unknown as React.PointerEvent<HTMLCanvasElement>));
    const ctx = canvas.current?.getContext("2d");
    if (ctx) draw(ctx, current, active.current);
  }
  function up() {
    const stroke = active.current; active.current = null;
    if (!stroke) return;
    setPages(old => old.map((p, i) => i === page ? { strokes: [...p.strokes, stroke] } : p));
    setRedo([]);
  }
  function undo() {
    if (!current.length) return;
    setRedo(old => [...old, current[current.length - 1]]);
    setPages(old => old.map((p, i) => i === page ? { strokes: p.strokes.slice(0, -1) } : p));
  }
  function redoStroke() {
    const stroke = redo[redo.length - 1];
    if (!stroke) return;
    setPages(old => old.map((p, i) => i === page ? { strokes: [...p.strokes, stroke] } : p));
    setRedo(old => old.slice(0, -1));
  }
  function download() {
    const canvasEl = canvas.current;
    if (!canvasEl) return;
    const a = document.createElement("a");
    a.download = `vetestudo-caderno-pagina-${page + 1}.png`;
    a.href = canvasEl.toDataURL("image/png");
    a.click();
  }
  return <div className="mx-auto max-w-7xl space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-3xl font-bold">Caderno digital</h1><p className="text-sm text-muted-foreground">Desenhado para iPad e Apple Pencil · guardado neste dispositivo</p></div>
      <div className="flex items-center gap-2"><Save className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Gravação automática</span></div>
    </div>
    <Input aria-label="Nome do caderno" value={title} onChange={e => setTitle(e.target.value)} className="max-w-sm" />
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-2xl border bg-card/95 p-3 shadow-sm backdrop-blur">
      {([["pen",Pen,"Caneta"],["highlighter",Highlighter,"Marcador"],["eraser",Eraser,"Borracha"],["hand",Hand,"Mover"]] as const).map(([id,Icon,label]) =>
        <Button key={id} type="button" variant={tool === id ? "default" : "outline"} size="sm" onClick={() => setTool(id)} title={label} aria-label={label}><Icon className="h-4 w-4" /></Button>)}
      <span className="mx-1 h-6 border-l" />
      {COLORS.map(c => <button key={c} type="button" aria-label={`Cor ${c}`} onClick={() => setColor(c)} style={{ background: c, outline: color === c ? "2px solid currentColor" : "none", outlineOffset: 3 }} className="h-7 w-7 rounded-full border border-black/10" />)}
      <input aria-label="Espessura" type="range" min="1" max="18" value={width} onChange={e => setWidth(Number(e.target.value))} className="w-24 accent-primary" />
      <Button size="sm" variant="outline" onClick={undo} disabled={!current.length} aria-label="Desfazer"><Undo2 className="h-4 w-4" /></Button>
      <Button size="sm" variant="outline" onClick={redoStroke} disabled={!redo.length} aria-label="Refazer"><Redo2 className="h-4 w-4" /></Button>
      <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={stylusOnly} onChange={e => setStylusOnly(e.target.checked)} /> Só Pencil</label>
    </div>
    <div className="overflow-auto rounded-2xl border bg-slate-100 p-3 sm:p-6">
      <div style={{ width: `${zoom}%`, maxWidth: "none", margin: "0 auto" }}>
        <canvas ref={canvas} width={W} height={H} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} style={{ touchAction: tool === "hand" ? "pan-x pan-y" : "none", width: "100%", height: "auto", display: "block", background: "white", boxShadow: "0 4px 20px #0002" }} aria-label="Folha de anotações" />
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-3">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={page === 0} onClick={() => { setPage(page - 1); setRedo([]); }}>Anterior</Button>
        <span className="text-sm">Página {page + 1} / {pages.length}</span>
        <Button size="sm" variant="outline" disabled={page === pages.length - 1} onClick={() => { setPage(page + 1); setRedo([]); }}>Seguinte</Button>
        <Button size="sm" onClick={() => { setPages(old => [...old, { strokes: [] }]); setPage(pages.length); setRedo([]); }}><Plus className="mr-1 h-4 w-4" /> Página</Button>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setZoom(z => Math.max(75, z - 25))}><Minus className="h-4 w-4" /></Button><span className="text-xs">{zoom}%</span>
        <Button size="sm" variant="outline" onClick={() => setZoom(z => Math.min(200, z + 25))}><Plus className="h-4 w-4" /></Button>
        <Button size="sm" variant="outline" onClick={download}><Download className="mr-1 h-4 w-4" /> PNG</Button>
        <Button size="sm" variant="outline" onClick={() => { if (confirm("Limpar esta página?")) { setPages(old => old.map((p,i) => i === page ? { strokes: [] } : p)); setRedo([]); } }}><RotateCcw className="h-4 w-4" /></Button>
        <Button size="sm" variant="outline" onClick={() => { if (confirm("Eliminar esta página?")) { setPages(old => old.length === 1 ? [{ strokes: [] }] : old.filter((_,i) => i !== page)); setPage(p => Math.max(0,p-1)); setRedo([]); } }}><Trash2 className="h-4 w-4" /></Button>
      </div>
    </div>
    <p className="text-xs text-muted-foreground">As notas são guardadas no armazenamento deste navegador, não sincronizadas entre dispositivos. Exporta as páginas importantes para manter uma cópia.</p>
  </div>;
}
