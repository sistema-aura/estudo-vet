import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Search, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/materiais/")({
  head: () => ({ meta: [{ title: "Materiais — VetEstudo" }, { name: "description", content: "Os teus PDFs organizados por disciplina." }] }),
  component: Materiais,
});

function Materiais() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [q, setQ] = useState("");

  const { data: materials = [] } = useQuery({
    queryKey: ["materials"],
    queryFn: async () => (await supabase.from("materials").select("id,title,subject,created_at").order("created_at", { ascending: false })).data ?? [],
  });

  const grouped = useMemo(() => {
    const f = materials.filter((m) => (m.title + m.subject).toLowerCase().includes(q.toLowerCase()));
    return f.reduce<Record<string, typeof f>>((acc, m) => ((acc[m.subject] ??= []).push(m), acc), {});
  }, [materials, q]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      try {
        setProgress(0);
        const { extractPdfText } = await import("@/lib/pdf");
        const content = await extractPdfText(file, (p) => setProgress(p * 80));
        const path = `shared/${crypto.randomUUID()}.pdf`;
        const { error: upErr } = await supabase.storage.from("materials").upload(path, file, { contentType: "application/pdf" });
        if (upErr) throw upErr;
        setProgress(95);
        const { error } = await supabase.from("materials").insert({
          title: file.name.replace(/\.pdf$/i, ""),
          subject: subject.trim() || "Geral",
          file_path: path,
          content,
        });
        if (error) throw error;
        toast.success(`"${file.name}" carregado`);
      } catch (e: any) {
        toast.error(e.message ?? "Erro ao carregar PDF");
      }
    }
    setProgress(null);
    if (fileRef.current) fileRef.current.value = "";
    qc.invalidateQueries({ queryKey: ["materials"] });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-bold">Materiais</h1>
      <div className="mt-6 rounded-2xl border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="subj">Disciplina (opcional)</Label>
            <Input id="subj" placeholder="ex.: Anatomia, Enfermagem, Farmacologia" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <input ref={fileRef} type="file" accept="application/pdf" multiple hidden onChange={(e) => upload(e.target.files)} />
          <Button onClick={() => fileRef.current?.click()} disabled={progress !== null}>
            <Upload className="mr-2 h-4 w-4" /> Carregar PDF
          </Button>
        </div>
        {progress !== null && <Progress value={progress} className="mt-4" />}
      </div>

      <div className="relative mt-6">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Procurar materiais…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {Object.keys(grouped).length === 0 && (
        <p className="mt-10 text-center text-muted-foreground">Ainda não há materiais. Carrega o teu primeiro PDF.</p>
      )}
      {Object.entries(grouped).map(([subj, items]) => (
        <section key={subj} className="mt-8">
          <h2 className="text-lg font-bold">{subj}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((m) => (
              <Link key={m.id} to="/materiais/$id" params={{ id: m.id }} className="flex items-start gap-3 rounded-xl border bg-card p-4 hover:border-primary">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <div className="font-medium">{m.title}</div>
                  <div className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString("pt-PT")}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
