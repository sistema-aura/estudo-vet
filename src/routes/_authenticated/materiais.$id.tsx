import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Brain, Check, CircleAlert, Download, FileText, GraduationCap, ListChecks, RefreshCw, Sparkles, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import catalog from "@/data/curso-catalogo.json";
import { catalogueModuleForName, moduleSubject } from "@/lib/materials";
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
  const [quizSavedToCards, setQuizSavedToCards] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [note, setNote] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [splitView, setSplitView] = useState(true);
  const [draftLoaded, setDraftLoaded] = useState<string | null>(null);
  const draftKey = `vetestudo-pdf-note-${id}`;
  useEffect(() => {
    try { setNote(localStorage.getItem(draftKey) ?? ""); } catch { setNote(""); }
    setDraftLoaded(draftKey);
    setNoteTitle(""); setEditingNote(null);
  }, [draftKey]);
  useEffect(() => { if (draftLoaded !== draftKey) return; try { localStorage.setItem(draftKey, note); } catch { toast.error("Não foi possível guardar o rascunho neste dispositivo."); } }, [draftKey, draftLoaded, note]);

  const { data: m, isPending: materialLoading, isError: materialError, refetch: refetchMaterial } = useQuery({
    queryKey: ["material", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("materials").select("*").eq("id", id).single();
      if (error) throw error;
      let url: string | null = null;
      if (data.file_path) {
        const signed = await supabase.storage.from("materials").createSignedUrl(data.file_path, 3600);
        url = signed.data?.signedUrl ?? null;
      }
      return { ...data, url };
    },
  });
  const { data: notes = [], isError: notesError } = useQuery({
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
    setQuizSavedToCards(false);
    try {
      setQuiz(await quizFn({ data: { id, count: 8 } }));
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao gerar perguntas");
    } finally {
      setBusy(null);
    }
  }
  function sendQuestionsToFlashcards() {
    if (!quiz || !m) return;
    try {
      type StoredCard = { id: string; question: string; answer: string; due: number; interval: number; module?: string };
      const stored: unknown = JSON.parse(window.localStorage.getItem("vetestudo-flashcards-v1") || "[]");
      if (!Array.isArray(stored)) throw new Error("O armazenamento de flashcards não tem um formato válido.");
      const old: StoredCard[] = stored.filter((item): item is StoredCard => !!item && typeof item === "object" && typeof item.question === "string" && typeof item.answer === "string");
      const existing = new Set(old.map(card => card.question.trim().toLocaleLowerCase("pt-PT")));
      const additions: StoredCard[] = [];
      for (const question of quiz.questions) {
        if (!question.question.trim() || question.correctIndex < 0 || question.correctIndex >= question.options.length) continue;
        const key = question.question.trim().toLocaleLowerCase("pt-PT");
        if (existing.has(key)) continue;
        existing.add(key);
        additions.push({ id: crypto.randomUUID(), question: question.question.trim(), answer: question.options[question.correctIndex] + "\n\n" + question.explanation, due: Date.now(), interval: 0, module: (() => { const found = catalogueModuleForName(m.title, catalog.modules); return found === null ? (m.subject?.startsWith("Módulo ") ? m.subject : "Geral") : moduleSubject(found); })() });
      }
      if (!additions.length) { toast.info("Estes cartões já estão guardados, ou não existem perguntas válidas."); return; }
      window.localStorage.setItem("vetestudo-flashcards-v1", JSON.stringify([...old, ...additions]));
      setQuizSavedToCards(true);
      toast.success(additions.length + " flashcards guardados no plano de estudo.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível guardar os flashcards."); }
  }

  async function addNote() {
    if (!note.trim()) return;
    const payload = { material_id: id, title: noteTitle.trim() || m?.title || "Nota", content: note };
    const { error } = editingNote
      ? await supabase.from("notes").update({ title: payload.title, content: payload.content }).eq("id", editingNote).eq("material_id", id)
      : await supabase.from("notes").insert(payload);
    if (error) { toast.error(error.message); return; }
    setNote(""); setNoteTitle(""); setEditingNote(null);
    toast.success(editingNote ? "Anotação atualizada." : "Anotação guardada.");
    await qc.invalidateQueries({ queryKey: ["notes", id] });
  }
  async function deleteNote(noteId: string) {
    if (!window.confirm("Apagar esta anotação? Esta ação não pode ser desfeita.")) return;
    const { error } = await supabase.from("notes").delete().eq("id", noteId).eq("material_id", id);
    if (error) { toast.error(error.message); return; }
    if (editingNote === noteId) { setEditingNote(null); setNote(""); setNoteTitle(""); }
    toast.success("Anotação apagada.");
    await qc.invalidateQueries({ queryKey: ["notes", id] });
  }
  async function remove() {
    if (!m || !window.confirm("Apagar este material da biblioteca? As notas associadas poderão também ser afetadas.")) return;
    // Delete the database record first: never orphan a live database record by deleting its PDF prematurely.
    const { error: deleteError } = await supabase.from("materials").delete().eq("id", id);
    if (deleteError) { toast.error("Não foi possível apagar: " + deleteError.message); return; }
    if (m.file_path) {
      const { error: storageError } = await supabase.storage.from("materials").remove([m.file_path]);
      if (storageError) toast.warning("Registo apagado, mas não foi possível remover o ficheiro armazenado.");
    }
    await qc.invalidateQueries({ queryKey: ["materials"] });
    await qc.invalidateQueries({ queryKey: ["counts"] });
    toast.success("Material removido da biblioteca.");
    void navigate({ to: "/materiais" });
  }

  if (materialLoading) return <div className="mx-auto max-w-6xl space-y-3"><div className="h-6 w-36 animate-pulse rounded-lg bg-muted"/><div className="h-11 w-2/3 animate-pulse rounded-lg bg-muted"/><p role="status" className="text-sm text-muted-foreground">A abrir material…</p></div>;
  if (materialError || !m) return <div role="alert" className="mx-auto max-w-2xl space-y-4 rounded-2xl border bg-card p-6"><h1 className="flex items-center gap-2 font-bold"><CircleAlert className="h-5 w-5 text-destructive"/> Não foi possível carregar o material</h1><p className="text-sm text-muted-foreground">Verifica a ligação ou tenta abrir novamente o documento.</p><div className="flex flex-wrap gap-2"><Button onClick={() => void refetchMaterial()}><RefreshCw className="mr-2 h-4 w-4"/> Tentar novamente</Button><Button asChild variant="outline"><Link to="/materiais">Voltar à biblioteca</Link></Button></div></div>;
  const score = quiz ? quiz.questions.filter((q, i) => answers[i] === q.correctIndex).length : 0;

  return (
    <div className="mx-auto max-w-6xl">
      <Link to="/materiais" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Materiais
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Documento de estudo</p>
          <h1 className="mt-1 break-words text-2xl font-extrabold tracking-tight sm:text-3xl">{m.title}</h1>
          <div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-primary/10 px-3 py-1.5 font-semibold text-primary">{m.subject}</span><span className="rounded-full bg-muted px-3 py-1.5 text-muted-foreground">{notes.length} anotação{notes.length === 1 ? "" : "ões"}</span><span className="rounded-full bg-muted px-3 py-1.5 text-muted-foreground">{m.content?.trim() ? "Texto disponível para IA" : "Sem texto extraído"}</span></div>
        </div>
        <div className="flex flex-wrap gap-2">{m.url && <Button asChild variant="outline" size="sm"><a href={m.url} target="_blank" rel="noopener noreferrer"><Download className="mr-2 h-4 w-4"/> Abrir original</a></Button>}<Button variant="outline" size="sm" onClick={() => void refetchMaterial()}><RefreshCw className="mr-2 h-4 w-4"/> Atualizar</Button><Button variant="outline" size="sm" onClick={remove} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/> Apagar</Button></div>
      </div>
      {!m.content?.trim() && <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-relaxed text-foreground"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"/> Este PDF não tem texto extraído. Podes lê-lo e fazer anotações, mas resumos e perguntas por IA necessitam de texto pesquisável. Documentos digitalizados podem exigir OCR.</div>}

      <Tabs defaultValue="pdf" className="mt-6">
        <TabsList className="h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="pdf"><FileText className="mr-1.5 h-4 w-4"/> Leitor PDF</TabsTrigger>
          <TabsTrigger value="notas">Notas ({notes.length})</TabsTrigger>
          <TabsTrigger value="resumo">Resumo IA</TabsTrigger>
          <TabsTrigger value="quiz">Perguntas IA</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-4 rounded-2xl border bg-card p-6">
          {m.summary ? (
            <>
              <Markdown>{m.summary}</Markdown>
              <Button variant="outline" className="mt-6" onClick={doSummary} disabled={busy !== null || !m.content?.trim()}>
                <Sparkles className="mr-2 h-4 w-4" /> {busy === "sum" ? "A gerar…" : "Gerar de novo"}
              </Button>
            </>
          ) : (
            <div className="py-10 text-center">
              <Brain className="mx-auto h-10 w-10 text-primary" />
              <p className="mt-3 text-muted-foreground">A IA lê o PDF e cria um resumo de estudo para ti.</p>
              <Button className="mt-4" onClick={doSummary} disabled={busy !== null || !m.content?.trim()}>
                <Sparkles className="mr-2 h-4 w-4" /> {busy === "sum" ? "A gerar resumo…" : "Gerar resumo"}
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="quiz" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={doQuiz} disabled={busy !== null || !m.content?.trim()}>
              <ListChecks className="mr-2 h-4 w-4" /> {busy === "quiz" ? "A criar perguntas…" : quiz ? "Novas perguntas" : "Criar perguntas"}
            </Button>
            {quiz && Object.keys(answers).length === quiz.questions.length && (
              <span className="rounded-full bg-secondary px-3 py-1 text-sm font-semibold">
                Acertaste {score} de {quiz.questions.length}
              </span>
            )}
            {quiz && <Button variant="outline" onClick={sendQuestionsToFlashcards} disabled={quizSavedToCards}><GraduationCap className="mr-2 h-4 w-4" />{quizSavedToCards ? "Flashcards guardados" : "Guardar como flashcards"}</Button>}
            {quizSavedToCards && <Link to="/estudo" className="text-sm font-semibold text-primary underline">Abrir os meus flashcards →</Link>}
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
          {notesError && <p role="alert" className="text-sm text-destructive">Não foi possível carregar as anotações deste PDF.</p>}
          {notes.map(n => <div key={n.id} className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{n.title}</h3><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => { setEditingNote(n.id); setNote(n.content); setNoteTitle(n.title); }}>Editar</Button><Button size="sm" variant="ghost" className="text-destructive" onClick={() => void deleteNote(n.id)} aria-label={"Apagar nota " + n.title}><Trash2 className="h-4 w-4"/></Button></div></div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{n.content}</p>
            <div className="mt-2 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("pt-PT")}</div>
          </div>)}
        </TabsContent>

        <TabsContent value="pdf" className="mt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">O leitor recorda a última página e permite pesquisar, sublinhar e exportar páginas com marcações.</p>
            <Button variant="outline" size="sm" onClick={() => setSplitView(v => !v)}>{splitView ? "Ver PDF completo" : "PDF + anotações"}</Button>
          </div>
          <div className={splitView ? "grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(300px,2fr)]" : ""}>
            <div className="min-w-0">
              {m.url ? <PdfReader url={m.url} materialId={id} /> : <div className="space-y-3 rounded-xl border bg-card p-6"><p className="text-sm text-muted-foreground">Não foi possível obter uma ligação de leitura ao PDF. Se o ficheiro ainda existir, tenta atualizar o acesso.</p><Button variant="outline" size="sm" onClick={() => void refetchMaterial()}><RefreshCw className="mr-2 h-4 w-4"/> Renovar acesso ao PDF</Button></div>}
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
