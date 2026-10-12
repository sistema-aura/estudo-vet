import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, FileText, Folder, FolderOpen, Search, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import catalog from "@/data/curso-catalogo.json";

export const Route = createFileRoute("/_authenticated/materiais/")({
  head: () => ({ meta: [{ title: "Materiais — VetEstudo" }] }),
  component: Materiais,
});
type Material = { id: string; title: string; subject: string; created_at: string };
const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\.pdf$/i, "").replace(/[^a-z0-9]/g, "");
function Materiais() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [moduleId, setModuleId] = useState<number | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const { data: materials = [] } = useQuery({
    queryKey: ["materials"],
    queryFn: async (): Promise<Material[]> => {
      const { data, error } = await supabase.from("materials").select("id,title,subject,created_at").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const active = catalog.modules.find(m => m.id === moduleId);
  const matched = useMemo(() => new Set(materials.map(m => normalize(m.title))), [materials]);
  const filter = q.trim().toLowerCase();
  const docs = active?.documents.filter(d => (d.filename + " " + d.theme + " " + d.unit).toLowerCase().includes(filter)) ?? [];
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      try {
        if (!file.name.toLowerCase().endsWith(".pdf")) throw new Error("Seleciona um PDF válido.");
        setProgress(0);
        const { extractPdfText } = await import("@/lib/pdf");
        const content = await extractPdfText(file, p => setProgress(p * 80));
        const path = `shared/${crypto.randomUUID()}.pdf`;
        const { error: upErr } = await supabase.storage.from("materials").upload(path, file, { contentType: "application/pdf" });
        if (upErr) throw upErr;
        setProgress(95);
        const { error } = await supabase.from("materials").insert({
          title: file.name.replace(/\.pdf$/i, ""),
          subject: moduleId ? `Módulo ${moduleId}` : "Geral",
          file_path: path,
          content,
        });
        if (error) {
          await supabase.storage.from("materials").remove([path]);
          throw error;
        }
        toast.success(`${file.name} carregado`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao carregar PDF");
      }
    }
    setProgress(null);
    if (fileRef.current) fileRef.current.value = "";
    await qc.invalidateQueries({ queryKey: ["materials"] });
  }
  return <div className="mx-auto max-w-6xl space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        {active && <button onClick={() => { setModuleId(null); setQ(""); }} className="mb-2 flex items-center gap-2 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> Todos os módulos</button>}
        <h1 className="text-3xl font-bold">{active ? active.name : "Materiais de estudo"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{active ? "Temas, subtemas e documentos do módulo" : "Os teus seis módulos, organizados em pastas"}</p>
      </div>
      <input ref={fileRef} type="file" accept=".pdf,application/pdf" multiple hidden onChange={e => void upload(e.target.files)} />
      <Button disabled={progress !== null} onClick={() => fileRef.current?.click()}><Upload className="mr-2 h-4 w-4" /> Carregar PDF</Button>
    </div>
    {progress !== null && <Progress value={progress} />}
    {!active ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3">
      {catalog.modules.map(m => <button key={m.id} onClick={() => { setModuleId(m.id); setQ(""); }} className="group flex flex-col items-center gap-3 rounded-2xl border bg-card px-4 py-8 text-center transition hover:border-primary hover:shadow-md">
        <Folder className="h-14 w-14 fill-primary/15 text-primary transition group-hover:scale-105" strokeWidth={1.4} />
        <span className="font-display text-lg font-bold">{m.name}</span>
        <span className="text-xs text-muted-foreground">{m.documents.length} PDFs previstos · {m.documents.filter(d => matched.has(normalize(d.filename))).length} carregados</span>
      </button>)}
    </div> : <>
      <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Pesquisar temas ou documentos…" value={q} onChange={e => setQ(e.target.value)} /></div>
      {docs.length === 0 && <p className="text-sm text-muted-foreground">Nenhum documento corresponde à pesquisa.</p>}
      {[...new Set(docs.map(d => d.theme))].map(theme => <section key={theme} className="rounded-2xl border bg-card p-4 sm:p-5">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><FolderOpen className="h-5 w-5 text-primary" /> {theme}</h2>
        <div className="space-y-2">
          {docs.filter(d => d.theme === theme).map(d => {
            const found = materials.find(m => normalize(m.title) === normalize(d.filename));
            return found ? <Link key={d.filename} to="/materiais/$id" params={{ id: found.id }} className="flex items-center gap-3 rounded-xl border p-3 hover:border-primary">
              <FileText className="h-5 w-5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{d.unit.includes(".") ? `Subtema ${d.unit.split(".")[1]}` : d.filename}</span>
              <span className="text-xs text-primary">Abrir PDF</span>
            </Link> : <div key={d.filename} className="flex items-center gap-3 rounded-xl border border-dashed p-3 text-muted-foreground">
              <FileText className="h-5 w-5 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-sm">{d.unit.includes(".") ? `Subtema ${d.unit.split(".")[1]} · ` : ""}{d.filename}</span>
              <span className="shrink-0 text-xs">Por carregar</span>
            </div>;
          })}
        </div>
      </section>)}
    </>}
    {materials.filter(m => !catalog.modules.some(mod => mod.documents.some(d => normalize(d.filename) === normalize(m.title)))).length > 0 && <section className="rounded-2xl border bg-card p-5">
      <h2 className="mb-3 font-semibold">Outros materiais</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {materials.filter(m => !catalog.modules.some(mod => mod.documents.some(d => normalize(d.filename) === normalize(m.title)))).map(m => <Link key={m.id} to="/materiais/$id" params={{ id: m.id }} className="flex items-center gap-2 rounded-lg border p-3 text-sm hover:border-primary"><FileText className="h-4 w-4 text-primary" /> {m.title}</Link>)}
      </div>
    </section>}
  </div>;
}
