import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/dicionario")({
  head: () => ({ meta: [{ title: "Dicionário — VetEstudo" }] }),
  component: Dicionario,
});

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
type Entry = { term: string; definition: string };
const arrow = /\s*(?:→|➜||⇒|->)\s*/;

// Extract in column order, not row order: the original glossary is laid out in two columns.
async function extractGlossary(file: File): Promise<Entry[]> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  if (pdf.numPages > 500) throw new Error("PDF demasiado extenso (máximo 500 páginas).");
  const entries: Entry[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    const text = await page.getTextContent();
    const items = text.items.filter((item): item is typeof text.items[number] & { str: string; transform: number[] } => "str" in item && "transform" in item);
    const mid = viewport.width / 2;
    for (const column of [items.filter(i => i.transform[4] < mid), items.filter(i => i.transform[4] >= mid)]) {
      const lines: { y: number; parts: { x: number; s: string }[] }[] = [];
      for (const item of column) {
        const y = item.transform[5];
        let line = lines.find(l => Math.abs(l.y - y) < 3);
        if (!line) { line = { y, parts: [] }; lines.push(line); }
        line.parts.push({ x: item.transform[4], s: item.str });
      }
      lines.sort((a, b) => b.y - a.y);
      let current: Entry | null = null;
      for (const line of lines) {
        const value = line.parts.sort((a, b) => a.x - b.x).map(i => i.s).join(" ").replace(/\s+/g, " ").trim();
        if (!value || /^(GLOSSÁRIO|TERMOS UTILIZADOS|[A-Z])$/i.test(value)) continue;
        const split = value.match(arrow);
        if (split && split.index !== undefined && split.index > 0 && split.index < 90) {
          const term = value.slice(0, split.index).trim();
          const definition = value.slice(split.index + split[0].length).trim();
          if (term.length >= 2 && term.length < 100 && definition) {
            current = { term, definition };
            entries.push(current);
            continue;
          }
        }
        if (current) current.definition += " " + value;
      }
    }
  }
  // Deduplicate terms (case and accents insensitive).
  return [...new Map(entries.map(e => [norm(e.term), e])).values()];
}

function Dicionario() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [def, setDef] = useState("");
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<Entry[]>([]);
  const { data: words = [] } = useQuery({
    queryKey: ["glossary"],
    queryFn: async () => {
      const { data, error } = await supabase.from("glossary").select("*").order("term");
      if (error) throw error;
      return data ?? [];
    },
  });
  const results = useMemo(() => {
    const n = norm(q.trim());
    if (!n) return words;
    const byTerm = words.filter(w => norm(w.term).includes(n));
    const byDef = words.filter(w => !byTerm.includes(w) && norm(w.definition).includes(n));
    return [...byTerm.sort((a,b) => Number(!norm(a.term).startsWith(n)) - Number(!norm(b.term).startsWith(n))), ...byDef];
  }, [words, q]);

  async function loadPdf(file?: File) {
    if (!file) return;
    if (file.size > 30 * 1024 * 1024 || !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Escolhe um PDF com menos de 30 MB."); return;
    }
    setImporting(true);
    try {
      const entries = await extractGlossary(file);
      setPreview(entries);
      if (!entries.length) toast.error("Não encontrei termos. Confirma se o PDF contém texto selecionável.");
      else toast.success(`${entries.length} termos extraídos. Revê a amostra e confirma a importação.`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao ler PDF"); }
    finally { setImporting(false); }
  }

  async function saveImport() {
    setImporting(true);
    try {
      const existing = new Set(words.map(w => norm(w.term)));
      const fresh = preview.filter(e => !existing.has(norm(e.term)));
      for (let i = 0; i < fresh.length; i += 50) {
        const { error } = await supabase.from("glossary").insert(fresh.slice(i, i + 50));
        if (error) throw error;
      }
      toast.success(`${fresh.length} termos importados; ${preview.length - fresh.length} já existentes.`);
      setPreview([]);
      await qc.invalidateQueries({ queryKey: ["glossary"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao importar"); }
    finally { setImporting(false); }
  }
  async function add() {
    if (!term.trim()) return;
    const { error } = await supabase.from("glossary").insert({ term: term.trim(), definition: def.trim() });
    if (error) { toast.error(error.message); return; }
    setTerm(""); setDef(""); setOpen(false);
    await qc.invalidateQueries({ queryKey: ["glossary"] });
  }
  async function del(id: string) {
    const { error } = await supabase.from("glossary").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries({ queryKey: ["glossary"] });
  }
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-bold">Dicionário</h1>
        <div className="flex gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <Upload className="h-4 w-4" /> {importing ? "A processar…" : "Importar PDF"}
            <input className="sr-only" type="file" accept="application/pdf,.pdf" disabled={importing} onChange={e => { void loadPdf(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          <Button onClick={() => setOpen(!open)}><Plus className="mr-1 h-4 w-4" /> Novo termo</Button>
        </div>
      </div>
      {preview.length > 0 && (
        <section className="mt-4 space-y-3 rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Pré-visualização: {preview.length} termos encontrados</h2>
          <p className="text-sm text-muted-foreground">Confirma a extração antes de guardar. Os termos já existentes serão ignorados.</p>
          <div className="max-h-48 space-y-2 overflow-auto text-sm">
            {preview.slice(0, 12).map(e => <p key={e.term}><strong>{e.term}:</strong> {e.definition}</p>)}
          </div>
          <div className="flex gap-2">
            <Button disabled={importing} onClick={() => void saveImport()}>Guardar termos</Button>
            <Button variant="outline" disabled={importing} onClick={() => setPreview([])}>Cancelar</Button>
          </div>
        </section>
      )}
      {open && <div className="mt-4 space-y-3 rounded-2xl border bg-card p-5">
        <Input placeholder="Termo (ex.: Anamnese)" value={term} onChange={e => setTerm(e.target.value)} />
        <Textarea placeholder="Significado" rows={3} value={def} onChange={e => setDef(e.target.value)} />
        <Button onClick={() => void add()}>Adicionar</Button>
      </div>}
      <div className="relative mt-6">
        <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
        <Input className="h-11 pl-10 text-base" placeholder="Pesquisar palavra…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{results.length} de {words.length} termos</p>
      <dl className="mt-4 divide-y rounded-2xl border bg-card">
        {results.map(w => <div key={w.id} className="group flex items-start justify-between gap-3 p-4">
          <div><dt className="font-display text-lg font-bold text-primary">{w.term}</dt><dd className="mt-1 whitespace-pre-wrap text-sm">{w.definition}</dd></div>
          <button onClick={() => void del(w.id)} aria-label="Apagar" className="text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
        </div>)}
        {results.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nenhum termo encontrado.</p>}
      </dl>
    </div>
  );
}
