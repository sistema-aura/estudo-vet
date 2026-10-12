import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Brain, Check, ListChecks, Sparkles, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateQuiz, summarizeMaterial } from "@/lib/study.functions";
import { Markdown } from "@/components/Markdown";
import { PdfReader } from "@/components/PdfReader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/materiais/$id")({
  head: () => ({ meta: [{ title: "Material — VetEstudo" }, { name: "description", content: "Estuda este material com IA." }] }),
  component: MaterialPage,
});

type Quiz = { questions: { question: string; options: string[]; correctIndex: number; explanation: string }[] };

function MaterialPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const summarize = useServerFn(summarizeMaterial);
  const quizFn = useServerFn(generateQuiz);
  const [busy, setBusy] = useState<"sum" | "quiz" | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [note, setNote] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [splitView, setSplitView] = useState(true);
  const draftKey = `vetestudo-pdf-note-${id}`;
  useEffect(() => { try { setNote(localStorage.getItem(draftKey) ?? ""); } catch {} }, [draftKey]);
  useEffect(() => { try { localStorage.setItem(draftKey, note); } catch {} }, [draftKey, note]);

  const { data: m } = useQuery({
    queryKey: ["material", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("materials").select("*").eq("id", id).single();
      if (error) throw error;
      let url: string | null = null;
      if (data.file_path) url = (await supabase.storage.from("materials").createSignedUrl(data.file_path, 3600)).data?.signedUrl ?? null;
      return { ...data, url };
    },
  });
  const { data: notes = [] } = useQuery({
    queryKey: ["notes", id],
    queryFn: async () => (await supabase.from("notes").select("*").eq("material_id", id).order("created_at", { ascending: false })).data ?? [],
  });

  async function doSummary() {
    setBusy("sum");
    try {
      await summarize({ data: { id } });
      qc.invalidateQueries({ queryKey: ["material", id] });
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao gerar resumo");
    } finally {
      setBusy(null);
    }
  }
  async function doQuiz() {
    setBusy("quiz");
    setAnswers({});
    try {
      setQuiz(await quizFn({ data: { id, count: 8 } }));
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao gerar perguntas");
    } finally {
      setBusy(null);
    }
  }
  async function addNote() {
    if (!note.trim()) return;
    const payload = { material_id: id, title: noteTitle.trim() || m?.title || "Nota", content: note };
    const { error } = editingNote
      ? await supabase.from("notes").update({ title: payload.title, content: payload.content }).eq("id", editingNote).eq("material_id", id)
      : await supabase.from("notes").insert(payload);
    if (error) { toast.error(error.message); return; }
    setNote(""); setNoteTitle(""); setEditingNote(null);
    qc.invalidateQueries({ queryKey: ["notes", id] });
  }
  async function remove() {
    if (!m || !confirm("Apagar este material?")) return;
    if (m.file_path) await supabase.storage.from("materials").remove([m.file_path]);
    await supabase.from("materials").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["materials"] });
    navigate({ to: "/materiais" });
  }

  if (!m) return <p className="text-muted-foreground">A carregar…</p>;
  const score = quiz ? quiz.questions.filter((q, i) => answers[i] === q.correctIndex).length : 0;

  return (
    <div className="mx-auto max-w-6xl">
      <Link to="/materiais" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Materiais
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{m.title}</h1>
          <p className="text-sm text-muted-foreground">{m.subject}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={remove} aria-label="Apagar"><Trash2 className="h-4 w-4" /></Button>
      </div>

      <Tabs defaultValue="resumo" className="mt-6">
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="quiz">Perguntas</TabsTrigger>
          <TabsTrigger value="notas">Anotações ({notes.length})</TabsTrigger>
          <TabsTrigger value="pdf">PDF</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-4 rounded-2xl border bg-card p-6">
          {m.summary ? (
            <>
              <Markdown>{m.summary}</Markdown>
              <Button variant="outline" className="mt-6" onClick={doSummary} disabled={busy !== null}>
                <Sparkles className="mr-2 h-4 w-4" /> {busy === "sum" ? "A gerar…" : "Gerar de novo"}
              </Button>
            </>
          ) : (
            <div className="py-10 text-center">
              <Brain className="mx-auto h-10 w-10 text-primary" />
              <p className="mt-3 text-muted-foreground">A IA lê o PDF e cria um resumo de estudo para ti.</p>
              <Button className="mt-4" onClick={doSummary} disabled={busy !== null}>
                <Sparkles className="mr-2 h-4 w-4" /> {busy === "sum" ? "A gerar resumo…" : "Gerar resumo"}
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="quiz" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={doQuiz} disabled={busy !== null}>
              <ListChecks className="mr-2 h-4 w-4" /> {busy === "quiz" ? "A criar perguntas…" : quiz ? "Novas perguntas" : "Criar perguntas"}
            </Button>
            {quiz && Object.keys(answers).length === quiz.questions.length && (
              <span className="rounded-full bg-secondary px-3 py-1 text-sm font-semibold">
                Acertaste {score} de {quiz.questions.length}
              </span>
            )}
          </div>
          {quiz?.questions.map((q, i) => {
            const chosen = answers[i];
            return (
              <div key={i} className="rounded-2xl border bg-card p-5">
                <p className="font-medium">{i + 1}. {q.question}</p>
                <div className="mt-3 grid gap-2">
                  {q.options.map((o, j) => {
                    const done = chosen !== undefined;
                    const right = j === q.correctIndex;
                    return (
                      <button
                        key={j}
                        disabled={done}
                        onClick={() => setAnswers({ ...answers, [i]: j })}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                          done && right ? "border-success bg-success/10" : done && chosen === j ? "border-destructive bg-destructive/10" : "hover:bg-muted"
                        }`}
                      >
                        {o}
                        {done && right && <Check className="h-4 w-4 text-success" />}
                        {done && chosen === j && !right && <X className="h-4 w-4 text-destructive" />}
                      </button>
                    );
                  })}
                </div>
                {chosen !== undefined && <p className="mt-3 text-sm text-muted-foreground">{q.explanation}</p>}
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="notas" className="mt-4 space-y-4">
          <div className="rounded-2xl border bg-card p-4">
            <p className="mb-3 text-sm text-muted-foreground">No iPad, ativa Escrever à mão (Scribble) em Definições → Apple Pencil. Escreve diretamente na caixa com o Pencil para converter a escrita em texto.</p>
            <input className="mb-3 w-full rounded-lg border bg-background p-3 text-base" placeholder="Título da anotação" value={noteTitle} onChange={e => setNoteTitle(e.target.value)} />
            <Textarea className="min-h-48 text-base" placeholder="Escreve aqui com o Apple Pencil ou teclado…" value={note} onChange={e => setNote(e.target.value)} rows={8} />
            <div className="mt-3 flex gap-2"><Button onClick={addNote} disabled={!note.trim()}>{editingNote ? "Atualizar anotação" : "Guardar anotação"}</Button>
            {editingNote && <Button variant="outline" onClick={() => { setEditingNote(null); setNote(""); setNoteTitle(""); }}>Cancelar</Button>}</div>
          </div>
          {notes.map(n => <div key={n.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{n.title}</h3><Button size="sm" variant="outline" onClick={() => { setEditingNote(n.id); setNote(n.content); setNoteTitle(n.title); }}>Editar</Button></div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{n.content}</p>
            <div className="mt-2 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("pt-PT")}</div>
          </div>)}
        </TabsContent>

        <TabsContent value="pdf" className="mt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Estuda com o documento aberto e escreve notas ao lado.</p>
            <Button variant="outline" size="sm" onClick={() => setSplitView(v => !v)}>{splitView ? "Ver PDF completo" : "PDF + anotações"}</Button>
          </div>
          <div className={splitView ? "grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(300px,2fr)]" : ""}>
            <div className="min-w-0">
              {m.url ? <PdfReader url={m.url} /> : <p className="rounded-xl border p-6 text-muted-foreground">PDF indisponível. Carrega o documento na página Materiais.</p>}
            </div>
            {splitView && <aside className="min-w-0 space-y-3 rounded-2xl border bg-card p-4">
              <h2 className="text-lg font-bold">As minhas anotações</h2>
              <p className="text-xs text-muted-foreground">Apple Pencil: usa Scribble no campo abaixo para transformar a escrita manual em texto. A conversão depende do idioma e das definições do iPadOS.</p>
              <input className="w-full rounded-lg border bg-background p-3 text-base" aria-label="Título da nota" placeholder="Título da nota" value={noteTitle} onChange={e => setNoteTitle(e.target.value)} />
              <Textarea className="min-h-[35vh] text-base" aria-label="Escrever anotação com Apple Pencil" placeholder="Escreve aqui com o Apple Pencil…" value={note} onChange={e => setNote(e.target.value)} rows={12} />
              <div className="flex flex-wrap gap-2"><Button onClick={addNote} disabled={!note.trim()}>{editingNote ? "Atualizar nota" : "Guardar nota"}</Button>
              {editingNote && <Button variant="outline" onClick={() => { setEditingNote(null); setNote(""); setNoteTitle(""); }}>Cancelar edição</Button>}</div>
              <p className="text-xs text-muted-foreground">Rascunho guardado neste navegador. Notas confirmadas ficam associadas a este PDF.</p>
              <div className="max-h-72 space-y-2 overflow-auto">
                {notes.map(n => <button key={n.id} className="block w-full rounded-lg border p-3 text-left hover:bg-muted" onClick={() => { setEditingNote(n.id); setNoteTitle(n.title); setNote(n.content); }}>
                  <span className="font-semibold">{n.title}</span><span className="mt-1 block line-clamp-3 whitespace-pre-wrap text-sm">{n.content}</span>
                </button>)}
              </div>
            </aside>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
