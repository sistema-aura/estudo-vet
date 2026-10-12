import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, FileText, Upload } from "lucide-react";
import catalog from "@/data/curso-catalogo.json";

export const Route = createFileRoute("/_authenticated/biblioteca")({
  head: () => ({ meta: [{ title: "Biblioteca — VetEstudo" }] }),
  component: Biblioteca,
});

function Biblioteca() {
  const [opened, setOpened] = useState<number[]>([1]);
  const [selected, setSelected] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);
  function showLocal(file: File) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return;
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(URL.createObjectURL(file));
    setPdfName(file.name);
  }
  const total = catalog.modules.reduce((sum, m) => sum + m.documents.length, 0);
  return <div className="mx-auto max-w-6xl space-y-6">
    <div>
      <h1 className="text-3xl font-bold">Biblioteca do curso</h1>
      <p className="mt-2 text-muted-foreground">6 módulos · {total} documentos · temas e subtemas organizados.</p>
    </div>
    <div className="grid gap-6 lg:grid-cols-[minmax(280px,380px)_1fr]">
      <div className="space-y-3">
        {catalog.modules.map(module => {
          const expanded = opened.includes(module.id);
          const groups = [...new Set(module.documents.map(d => d.theme))];
          return <section key={module.id} className="overflow-hidden rounded-xl border bg-card">
            <button className="flex w-full items-center justify-between p-4 text-left font-semibold" onClick={() => setOpened(old => expanded ? old.filter(id => id !== module.id) : [...old,module.id])}>
              <span className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> {module.name}</span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">{module.documents.length} PDFs {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>
            </button>
            {expanded && <div className="border-t px-3 pb-3">
              {groups.map(group => <div key={group} className="mt-3">
                <h3 className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</h3>
                {module.documents.filter(d => d.theme === group).map(d => <button key={d.filename} onClick={() => { setSelected(d.filename); setPdfName(null); if (pdfUrl) URL.revokeObjectURL(pdfUrl); setPdfUrl(null); }} className={`mt-1 flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm hover:bg-muted ${selected === d.filename ? "bg-muted font-medium" : ""}`}>
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  {d.unit.includes(".") ? `Subtema ${d.unit.split(".")[1]}` : d.theme}
                  <span className="ml-auto text-xs text-muted-foreground">PDF</span>
                </button>)}
              </div>)}
            </div>}
          </section>;
        })}
        <Link to="/dicionario" className="flex items-center gap-3 rounded-xl border bg-card p-4 font-semibold hover:bg-muted"><BookOpen className="h-5 w-5 text-primary" /> Dicionário veterinário <ChevronRight className="ml-auto h-4 w-4" /></Link>
      </div>
      <section className="min-h-[420px] rounded-xl border bg-card p-4">
        <h2 className="text-lg font-semibold">{selected ? selected.replace(".pdf", "") : "Leitor de PDFs"}</h2>
        <p className="mt-2 text-sm text-muted-foreground">A estrutura está pronta. Para veres um PDF agora, seleciona-o no teu dispositivo. Os ficheiros ainda não estão alojados no site.</p>
        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          <Upload className="h-4 w-4" /> Abrir PDF neste dispositivo
          <input type="file" accept=".pdf,application/pdf" className="sr-only" onChange={e => { const file=e.target.files?.[0]; if(file) showLocal(file); }} />
        </label>
        {pdfUrl && <div className="mt-4"><p className="mb-2 text-sm font-medium">{pdfName}</p><iframe title="Leitor de PDF" src={pdfUrl} className="h-[70vh] w-full rounded-lg border" /></div>}
        {!pdfUrl && <div className="mt-8 flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center text-muted-foreground"><FileText className="mb-3 h-10 w-10" /><p>Seleciona um documento para começar a estudar.</p></div>}
      </section>
    </div>
  </div>;
}
