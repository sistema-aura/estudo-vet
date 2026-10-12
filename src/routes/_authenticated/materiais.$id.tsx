import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Brain, Check, ListChecks, Sparkles, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateQuiz, summarizeMaterial } from "@/lib/study.functions";
import { Markdown } from "@/components/Markdown";
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
    const { error } = await supabase.from("notes").insert({ material_id: id, title: m?.title ?? "Nota", content: note });
    if (error) { toast.error(error.message); return; }
    setNote("");
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
            <Textarea placeholder="Escreve uma anotação sobre este material…" value={note} onChange={(e) => setNote(e.target.value)} rows={4} />
            <Button className="mt-3" onClick={addNote}>Guardar anotação</Button>
          </div>
          {notes.map((n) => (
            <div key={n.id} className="whitespace-pre-wrap rounded-xl border bg-card p-4 text-sm">
              {n.content}
              <div className="mt-2 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("pt-PT")}</div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="pdf" className="mt-4">
          {m.url ? (
            <iframe src={m.url} title={m.title} className="h-[80vh] w-full rounded-2xl border" />
          ) : (
            <p className="text-muted-foreground">PDF indisponível.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
