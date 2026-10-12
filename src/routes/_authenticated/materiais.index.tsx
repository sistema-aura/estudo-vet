import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, CircleAlert, CloudUpload, FileCheck2, FilePlus2, FileText, FolderClosed, FolderOpen, HardDriveDownload, Layers3, Search, ShieldAlert, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import catalog from "@/data/curso-catalogo.json";
import {
  assertPdfFile, belongsToModule, catalogueModuleForName, formatFileSize,
  isCatalogued, moduleSubject, normalizePdfName, type MaterialListItem,
} from "@/lib/materials";

export const Route = createFileRoute("/_authenticated/materiais/")({
  head: () => ({ meta: [{ title: "Biblioteca de PDFs — VetEstudo" }, { name: "description", content: "PDFs organizados pelos módulos do curso." }] }),
  component: Materiais,
});

type UploadStatus = { name: string; size: string; position: number; total: number; percent: number; stage: string };
type StatusFilter = "todos" | "carregados" | "pendentes";
const modules = catalog.modules;

async function listMaterials(): Promise<MaterialListItem[]> {
  const all: MaterialListItem[] = [];
  for (let offset = 0; offset < 10000; offset += 500) {
    const { data, error } = await supabase.from("materials")
      .select("id,title,subject,created_at").order("created_at", { ascending: false })
      .range(offset, offset + 499);
    if (error) throw error;
    const batch = data ?? [];
    all.push(...batch);
    if (batch.length < 500) break;
  }
  return all;
}

function MaterialsLink({ material, compact = false }: { material: MaterialListItem; compact?: boolean }) {
  return <Link to="/materiais/$id" params={{ id: material.id }}
    className="group flex min-w-0 items-center gap-3 rounded-xl border bg-card px-3 py-3 transition hover:border-primary/60 hover:bg-muted/40 hover:shadow-sm">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText size={20} /></span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-semibold">{material.title}</span>
      {!compact && <span className="block truncate text-xs text-muted-foreground">{material.subject} · {new Date(material.created_at).toLocaleDateString("pt-PT")}</span>}
    </span>
    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
  </Link>;
}

function Materiais() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [moduleId, setModuleId] = useState<number | null>(null);
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [uploading, setUploading] = useState<UploadStatus | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [moving, setMoving] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const { data: materials = [], isPending, isError, refetch } = useQuery({
    queryKey: ["materials"], queryFn: listMaterials,
  });
  const currentModule = modules.find(m => m.id === moduleId);
  const normalQuery = normalizePdfName(query.trim());
  const existingNames = useMemo(() => new Set(materials.map(m => normalizePdfName(m.title))), [materials]);
  const cataloguedNames = useMemo(() => new Set(modules.flatMap(m => m.documents.map(d => normalizePdfName(d.filename)))), []);
  const loadedFromCatalog = useMemo(() => modules.reduce((sum, m) => sum + m.documents.filter(d => existingNames.has(normalizePdfName(d.filename))).length, 0), [existingNames]);
  const totalCatalog = modules.reduce((sum, m) => sum + m.documents.length, 0);
  const moduleExtras = useMemo(() => currentModule ? materials.filter(m => !isCatalogued(m, modules) && belongsToModule(m, currentModule, modules)) : [], [materials, currentModule]);
  const personalGeneral = useMemo(() => materials.filter(m => !isCatalogued(m, modules) && m.subject !== "Módulo 1" && m.subject !== "Módulo 2" && m.subject !== "Módulo 3" && m.subject !== "Módulo 4" && m.subject !== "Módulo 5" && m.subject !== "Módulo 6"), [materials]);
  const visibleModules = modules.filter(m => !normalQuery || normalizePdfName(m.name).includes(normalQuery) || m.documents.some(d => normalizePdfName(d.filename + " " + d.theme + " " + d.unit).includes(normalQuery)));
  const shownDocs = currentModule?.documents.filter(d => {
    const exists = existingNames.has(normalizePdfName(d.filename));
    const matchesStatus = status === "todos" || (status === "carregados" ? exists : !exists);
    return matchesStatus && (!normalQuery || normalizePdfName(d.filename + " " + d.theme + " " + d.unit).includes(normalQuery));
  }) ?? [];
  const visibleExtras = moduleExtras.filter(m => (!normalQuery || normalizePdfName(m.title).includes(normalQuery)) && status !== "pendentes");
  const generalShown = personalGeneral.filter(m => !normalQuery || normalizePdfName(m.title + " " + m.subject).includes(normalQuery));

  async function upload(filesInput: FileList | File[]) {
    const files = Array.from(filesInput);
    if (!files.length || uploading) return;
    const names = new Set(existingNames);
    let success = 0, skipped = 0, failed = 0, noText = 0;
    for (const [index, file] of files.entries()) {
      try {
        setUploading({ name: file.name, size: formatFileSize(file.size), position: index + 1, total: files.length, percent: index / files.length * 100, stage: "A validar ficheiro" });
        await assertPdfFile(file);
        const normalized = normalizePdfName(file.name);
        if (names.has(normalized)) { skipped++; continue; }
        const knownModule = catalogueModuleForName(file.name, modules);
        const destination = knownModule ?? moduleId;
        let content = "";
        let extractionFailed = false;
        try {
          const { extractPdfText } = await import("@/lib/pdf");
          content = await extractPdfText(file, fraction => setUploading({
            name: file.name, size: formatFileSize(file.size), position: index + 1, total: files.length,
            percent: (index + Math.max(0, Math.min(1, fraction)) * .75) / files.length * 100,
            stage: "A ler o texto do PDF",
          }));
        } catch {
          extractionFailed = true;
        }
        if (!content.trim()) noText++;
        setUploading({ name: file.name, size: formatFileSize(file.size), position: index + 1, total: files.length, percent: (index + .8) / files.length * 100, stage: "A guardar PDF na biblioteca" });
        const storagePath = "shared/" + crypto.randomUUID() + ".pdf";
        const { error: storageError } = await supabase.storage.from("materials").upload(storagePath, file, { contentType: "application/pdf" });
        if (storageError) throw storageError;
        const { error: insertError } = await supabase.from("materials").insert({
          title: file.name.replace(/\.pdf$/i, ""),
          subject: moduleSubject(destination),
          file_path: storagePath,
          content: content.slice(0, 500000),
        });
        if (insertError) {
          await supabase.storage.from("materials").remove([storagePath]);
          throw insertError;
        }
        names.add(normalized); success++;
        if (extractionFailed) toast.warning(file.name + ": PDF guardado, mas a extração de texto falhou. As funções de IA podem não estar disponíveis.");
      } catch (error) {
        failed++;
        toast.error(file.name + ": " + (error instanceof Error ? error.message : "Não foi possível carregar este PDF."));
      } finally {
        setUploading({ name: file.name, size: formatFileSize(file.size), position: index + 1, total: files.length, percent: (index + 1) / files.length * 100, stage: "Concluído" });
      }
    }
    setUploading(null);
    if (fileRef.current) fileRef.current.value = "";
    await qc.invalidateQueries({ queryKey: ["materials"] });
    await qc.invalidateQueries({ queryKey: ["counts"] });
    if (success) toast.success(success + " PDF" + (success === 1 ? "" : "s") + " carregado" + (success === 1 ? "" : "s") + " com sucesso.");
    if (skipped) toast.info(skipped + " ficheiro(s) ignorado(s), porque já existem na biblioteca.");
    if (noText) toast.info(noText + " PDF(s) sem texto extraível. Podem ser digitalizações; é necessário OCR para pesquisas e resumos.");
    if (failed) toast.warning(failed + " ficheiro(s) não foram carregados. Consulta as mensagens apresentadas.");
  }

  async function moveCustomMaterial(material: MaterialListItem, newSubject: string) {
    if (cataloguedNames.has(normalizePdfName(material.title)) || moving) return;
    setMoving(material.id);
    try {
      const { error } = await supabase.from("materials").update({ subject: newSubject }).eq("id", material.id);
      if (error) throw error;
      toast.success("Documento movido para " + newSubject + ".");
      await qc.invalidateQueries({ queryKey: ["materials"] });
      await qc.invalidateQueries({ queryKey: ["material", material.id] });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível mover o PDF."); }
    finally { setMoving(null); }
  }

  const overallPercent = totalCatalog ? Math.round(loadedFromCatalog / totalCatalog * 100) : 0;
  return <div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        {currentModule && <button type="button" className="mb-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline" onClick={() => { setModuleId(null); setStatus("todos"); setQuery(""); }}><ArrowLeft size={16} /> Todos os módulos</button>}
        <p className="text-xs font-bold uppercase tracking-[.15em] text-primary">A tua biblioteca</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{currentModule ? currentModule.name : "Materiais e PDFs"}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{currentModule ? "Os documentos deste módulo, organizados por temas, com os teus PDFs adicionais." : "Organiza os PDFs do curso, retoma a leitura e transforma os materiais em estudo ativo."}</p>
      </div>
      <Button disabled={uploading !== null} onClick={() => fileRef.current?.click()} className="min-h-11"><Upload className="mr-2 h-4 w-4" /> Carregar PDFs</Button>
    </header>

    <input ref={fileRef} type="file" accept=".pdf,application/pdf" multiple className="sr-only" aria-label="Selecionar ficheiros PDF" onChange={event => { if (event.target.files) void upload(event.target.files); }} />
    <section aria-label="Carregamento de documentos" className={"rounded-2xl border-2 border-dashed p-5 transition-colors " + (dragOver ? "border-primary bg-primary/10" : "border-border bg-card/60")}
      onDragOver={event => { event.preventDefault(); if (!uploading) setDragOver(true); }}
      onDragLeave={event => { event.preventDefault(); setDragOver(false); }}
      onDrop={event => { event.preventDefault(); setDragOver(false); if (!uploading) void upload(Array.from(event.dataTransfer.files)); }}>
      <div className="flex flex-wrap items-center gap-4">
        <span className="rounded-2xl bg-primary/10 p-4 text-primary"><CloudUpload size={28} /></span>
        <div className="min-w-0 flex-1"><h2 className="font-bold">Arrasta os PDFs para a biblioteca</h2><p className="mt-1 text-sm text-muted-foreground">Ou usa «Carregar PDFs». Aceita vários ficheiros, até 80 MB cada; os PDFs do curso são colocados automaticamente no módulo certo.</p></div>
        <Button type="button" variant="outline" disabled={uploading !== null} onClick={() => fileRef.current?.click()}><FilePlus2 className="mr-2 h-4 w-4"/> Escolher ficheiros</Button>
      </div>
      {uploading && <div role="status" aria-live="polite" className="mt-4 space-y-2 border-t pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><span className="min-w-0 truncate font-semibold">{uploading.name} · {uploading.size} · {uploading.position}/{uploading.total}</span><span className="text-muted-foreground">{uploading.stage} · progresso estimado: {Math.round(uploading.percent)}%</span></div>
        <Progress value={uploading.percent} />
      </div>}
    </section>

    <aside className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-foreground"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"/><div><strong>Privacidade dos documentos:</strong> a configuração atual da base de dados utiliza permissões partilhadas para materiais e notas. Evita carregar dados pessoais de clientes, animais identificáveis ou documentos confidenciais até existir autenticação e controlo de acesso individual.</div></aside>
    {isError && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"><CircleAlert className="h-5 w-5 text-destructive"/> Não foi possível consultar os documentos da biblioteca.<Button size="sm" variant="outline" onClick={() => void refetch()}>Tentar novamente</Button></div>}
    <section aria-label="Resumo da biblioteca" className="grid gap-3 sm:grid-cols-3">
      <div className="flex items-center gap-4 rounded-2xl border bg-card p-4"><span className="rounded-xl bg-primary/10 p-3 text-primary"><BookOpen size={22}/></span><div><div className="text-2xl font-extrabold tabular-nums">{isPending ? "—" : materials.length}</div><div className="text-xs text-muted-foreground">PDFs na biblioteca</div></div></div>
      <div className="flex items-center gap-4 rounded-2xl border bg-card p-4"><span className="rounded-xl bg-primary/10 p-3 text-primary"><FileCheck2 size={22}/></span><div><div className="text-2xl font-extrabold tabular-nums">{isPending ? "—" : loadedFromCatalog + " / " + totalCatalog}</div><div className="text-xs text-muted-foreground">Documentos do curso</div></div></div>
      <div className="rounded-2xl border bg-card p-4"><div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>Catálogo carregado</span><span className="font-bold text-foreground">{isPending ? "—" : overallPercent + "%"}</span></div><Progress className="mt-3" value={isPending ? 0 : overallPercent}/><div className="mt-2 text-xs text-muted-foreground">{isPending ? "A carregar…" : totalCatalog - loadedFromCatalog + " por carregar"}</div></div>
    </section>

    <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input className="pl-9" value={query} onChange={e => setQuery(e.target.value)} aria-label="Pesquisar materiais" placeholder={currentModule ? "Pesquisar temas, unidades e documentos deste módulo…" : "Pesquisar módulos, temas ou nomes de PDFs…"}/>{query && <button type="button" onClick={() => setQuery("")} aria-label="Limpar pesquisa" className="absolute right-2 top-1.5 rounded-md p-1.5 text-muted-foreground hover:text-foreground"><X size={16}/></button>}</div>

    {!currentModule ? <>
      <section aria-labelledby="modulos" className="space-y-4">
        <h2 id="modulos" className="flex items-center gap-2 text-xl font-bold"><Layers3 size={20} className="text-primary"/> Módulos do curso</h2>
        {visibleModules.length === 0 && <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">Nenhum módulo corresponde à pesquisa.</p>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {visibleModules.map(m => {
            const count = m.documents.filter(d => existingNames.has(normalizePdfName(d.filename))).length;
            const percent = Math.round(count / Math.max(1, m.documents.length) * 100);
            const extras = materials.filter(row => !isCatalogued(row, modules) && belongsToModule(row, m, modules)).length;
            return <button type="button" key={m.id} onClick={() => { setModuleId(m.id); setQuery(""); setStatus("todos"); }} className="group rounded-2xl border bg-card p-4 text-left transition hover:border-primary/60 hover:shadow-md sm:p-5">
              <div className="flex items-center justify-between"><span className="rounded-xl bg-primary/10 p-3 text-primary"><FolderClosed size={25}/></span><ArrowRight size={17} className="text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary"/></div>
              <h3 className="mt-4 text-base font-bold">{m.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{isPending ? "…" : count} de {m.documents.length} documentos {extras ? "· " + extras + " adicionais" : ""}</p>
              <Progress value={isPending ? 0 : percent} className="mt-4" />
              <p className="mt-1.5 text-right text-xs font-semibold text-primary">{isPending ? "—" : percent + "%"}</p>
            </button>;
          })}
        </div>
      </section>
      {generalShown.length > 0 && <section className="space-y-3" aria-labelledby="outros"><h2 id="outros" className="flex items-center gap-2 text-xl font-bold"><HardDriveDownload size={20} className="text-primary"/> Outros materiais ({generalShown.length})</h2><p className="text-sm text-muted-foreground">PDFs que não fazem parte do catálogo. Podes colocá-los noutro módulo sem os voltar a carregar.</p>
        <div className="grid gap-3 sm:grid-cols-2">{generalShown.map(m => <div key={m.id} className="space-y-2"><MaterialsLink material={m}/><label className="flex items-center gap-2 px-1 text-xs text-muted-foreground">Mover para<select aria-label={"Mover " + m.title} disabled={moving === m.id} value={m.subject.startsWith("Módulo ") ? m.subject : "Geral"} onChange={e => void moveCustomMaterial(m, e.target.value)} className="min-w-0 rounded-lg border bg-background px-2 py-1.5 text-xs text-foreground"><option value="Geral">Geral</option>{modules.map(mod => <option key={mod.id} value={moduleSubject(mod.id)}>{mod.name}</option>)}</select></label></div>)}</div>
      </section>}
    </> : <>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Documentos previstos ({currentModule.documents.length})</h2><div role="group" aria-label="Filtrar documentos" className="flex flex-wrap gap-1 rounded-xl border bg-card p-1">{([{key:"todos",label:"Todos"},{key:"carregados",label:"Carregados"},{key:"pendentes",label:"Por carregar"}] as const).map(option => <Button key={option.key} size="sm" variant={status === option.key ? "default" : "ghost"} onClick={() => setStatus(option.key)}>{option.label}</Button>)}</div></div>
      {shownDocs.length === 0 && <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">Não foram encontrados documentos com estes filtros.</p>}
      {[...new Set(shownDocs.map(d => d.theme))].map(theme => <section key={theme} className="space-y-3 rounded-2xl border bg-card p-4 sm:p-5">
        <h3 className="flex items-center gap-2 font-bold"><FolderOpen size={19} className="text-primary"/>{theme}</h3>
        <div className="grid gap-2">
          {shownDocs.filter(d => d.theme === theme).map(d => {
            const found = materials.find(m => normalizePdfName(m.title) === normalizePdfName(d.filename));
            return found ? <MaterialsLink material={found} compact key={d.filename}/> : <div key={d.filename} className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed px-3 py-3">
              <span className="rounded-xl bg-muted p-2.5 text-muted-foreground"><FileText size={18}/></span><span className="min-w-0 flex-1"><span className="block break-all text-sm font-medium">{d.filename}</span><span className="text-xs text-muted-foreground">Ainda não carregado</span></span><Button size="sm" variant="outline" disabled={uploading !== null} onClick={() => fileRef.current?.click()}><Upload className="mr-1.5 h-3.5 w-3.5"/> Carregar</Button>
            </div>;
          })}
        </div>
      </section>)}
      {visibleExtras.length > 0 && <section className="space-y-3 rounded-2xl border bg-card p-4 sm:p-5"><h2 className="flex items-center gap-2 font-bold"><FilePlus2 size={19} className="text-primary"/> Os teus PDFs adicionais ({visibleExtras.length})</h2><div className="grid gap-3 sm:grid-cols-2">{visibleExtras.map(m => <div key={m.id} className="space-y-2"><MaterialsLink material={m}/><label className="flex items-center gap-2 px-1 text-xs text-muted-foreground">Mover para<select aria-label={"Mover " + m.title} value={m.subject} disabled={moving === m.id} onChange={e => void moveCustomMaterial(m, e.target.value)} className="rounded-lg border bg-background px-2 py-1.5 text-xs text-foreground"><option value="Geral">Geral</option>{modules.map(mod => <option key={mod.id} value={moduleSubject(mod.id)}>{mod.name}</option>)}</select></label></div>)}</div></section>}
    </>}

    <p className="flex items-start gap-2 rounded-xl border bg-card p-3 text-xs leading-relaxed text-muted-foreground"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary"/> Os PDFs são guardados na biblioteca. O texto extraído é utilizado para resumos e perguntas de estudo; documentos digitalizados sem texto necessitam de OCR, ainda não incluído.</p>
  </div>;
}
