import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Upload, Clock3, CheckCircle2, Layers3 } from "lucide-react";
import catalog from "@/data/curso-catalogo.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/estudo")({
  head: () => ({ meta: [{ title: "Plano e flashcards — VetEstudo" }] }),
  component: Estudo,
});
type Card = { id: string; question: string; answer: string; due: number; interval: number; module?: string };
type Goal = { id: string; text: string; done: boolean };
function read<T>(key: string, fallback: T): T {
  try { const value = JSON.parse(localStorage.getItem(key) || "null"); return Array.isArray(value) ? value as T : fallback; }
  catch { return fallback; }
}
function Estudo() {
  const [cards, setCards] = useState<Card[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [goal, setGoal] = useState("");
  const [show, setShow] = useState<string | null>(null);
  const [module, setModule] = useState("Geral");
  useEffect(() => { setCards(read<Card[]>("vetestudo-flashcards-v1", [])); setGoals(read<Goal[]>("vetestudo-goals-v1", [])); setLoaded(true); }, []);
  useEffect(() => { if (!loaded) return; try { localStorage.setItem("vetestudo-flashcards-v1", JSON.stringify(cards)); } catch { toast.error("Não foi possível guardar os flashcards neste dispositivo."); } }, [cards, loaded]);
  useEffect(() => { if (!loaded) return; try { localStorage.setItem("vetestudo-goals-v1", JSON.stringify(goals)); } catch { toast.error("Não foi possível guardar os objetivos neste dispositivo."); } }, [goals, loaded]);
  const due = cards.filter(c => (module === "Todos" || (c.module || "Geral") === module) && c.due <= Date.now()).sort((a,b) => a.due - b.due);
  const mastered = cards.filter(c => c.interval >= 7).length;
  const goalDone = goals.filter(g => g.done).length;

  function exportBackup() {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), cards, goals }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "vetestudo-estudo-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    toast.success("Cópia de segurança preparada.");
  }

  async function importBackup(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error("O ficheiro não pode exceder 2 MB.");
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object" || !("cards" in parsed) || !("goals" in parsed) || !Array.isArray(parsed.cards) || !Array.isArray(parsed.goals)) {
        throw new Error("Ficheiro inválido. Escolhe uma cópia de segurança do VetEstudo.");
      }
      const importedCards: Card[] = parsed.cards.filter((c: unknown): c is Card => !!c && typeof c === "object" && typeof (c as Card).question === "string" && typeof (c as Card).answer === "string" && (c as Card).question.length <= 4000 && (c as Card).answer.length <= 12000).map((c: Card) => ({ id: crypto.randomUUID(), question: c.question, answer: c.answer, module: typeof c.module === "string" ? c.module : "Geral", due: typeof c.due === "number" && Number.isFinite(c.due) ? c.due : Date.now(), interval: typeof c.interval === "number" && Number.isFinite(c.interval) ? Math.max(0, Math.min(90, c.interval)) : 0 }));
      const importedGoals: Goal[] = parsed.goals.filter((g: unknown): g is Goal => !!g && typeof g === "object" && typeof (g as Goal).text === "string" && (g as Goal).text.length <= 500).map((g: Goal) => ({ id: crypto.randomUUID(), text: g.text, done: g.done === true }));
      if (parsed.cards.length !== importedCards.length || parsed.goals.length !== importedGoals.length) throw new Error("A cópia de segurança contém dados inválidos.");
      setCards(old => [...old, ...importedCards]);
      setGoals(old => [...old, ...importedGoals]);
      toast.success("Importados " + importedCards.length + " flashcards e " + importedGoals.length + " objetivos.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível importar a cópia de segurança."); }
    finally { if (importRef.current) importRef.current.value = ""; }
  }

  function review(id: string, remembered: boolean) {
    setCards(old => old.map(c => {
      if (c.id !== id) return c;
      const interval = remembered ? Math.min(90, Math.max(1, c.interval * 2)) : 1;
      return { ...c, interval, due: Date.now() + interval * 86400000 };
    }));
    setShow(null);
  }
  return <div className="mx-auto max-w-4xl space-y-8">
    <div><h1 className="text-3xl font-bold">O meu estudo</h1><p className="mt-2 text-muted-foreground">Flashcards com revisão espaçada e objetivos de estudo. Guardados neste dispositivo.</p></div>
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border bg-card p-4"><Clock3 className="h-5 w-5 text-primary"/><p className="mt-3 text-3xl font-bold tabular-nums">{loaded ? due.length : "—"}</p><p className="text-sm text-muted-foreground">Para rever nesta pasta</p></div>
      <div className="rounded-2xl border bg-card p-4"><Layers3 className="h-5 w-5 text-primary"/><p className="mt-3 text-3xl font-bold tabular-nums">{loaded ? mastered : "—"}</p><p className="text-sm text-muted-foreground">Cartões com revisão ≥ 7 dias</p></div>
      <div className="rounded-2xl border bg-card p-4"><CheckCircle2 className="h-5 w-5 text-primary"/><p className="mt-3 text-3xl font-bold tabular-nums">{loaded ? goalDone + "/" + goals.length : "—"}</p><p className="text-sm text-muted-foreground">Objetivos concluídos</p></div>
    </div>
    <section className="space-y-4 rounded-2xl border bg-card p-5">
      <h2 className="text-xl font-bold">Flashcards · {due.length} para rever</h2>
      <label className="block text-sm">Pasta / módulo<select className="mt-1 block w-full rounded-md border bg-background p-2" value={module} onChange={e => { setModule(e.target.value); setShow(null); }}><option value="Todos">Todos</option><option value="Geral">Geral</option>{catalog.modules.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}</select></label>
      {due.length ? <div className="space-y-3 rounded-xl border p-5">
        <p className="text-lg font-semibold">{due[0].question}</p>
        {show === due[0].id ? <><p className="whitespace-pre-wrap">{due[0].answer}</p><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => review(due[0].id, false)}>Preciso de rever</Button><Button onClick={() => review(due[0].id, true)}>Já sei</Button></div></> : <Button onClick={() => setShow(due[0].id)}>Mostrar resposta</Button>}
      </div> : <p className="text-sm text-muted-foreground">Sem cartões pendentes. Cria cartões ou volta quando chegar a próxima revisão.</p>}
      <h3 className="font-semibold">Novo cartão</h3>
      <Input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Pergunta (ex.: O que é a anamnese?)" />
      <Textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Resposta" />
      <Button disabled={!question.trim() || !answer.trim()} onClick={() => { setCards(old => [...old, { id: crypto.randomUUID(), question: question.trim(), answer: answer.trim(), due: Date.now(), interval: 0, module: module === "Todos" ? "Geral" : module }]); setQuestion(""); setAnswer(""); }}>Adicionar flashcard</Button>
      <p className="text-sm text-muted-foreground">{cards.filter(c => module === "Todos" || (c.module || "Geral") === module).length} cartões nesta pasta</p>
      {cards.length > 0 && <details><summary className="cursor-pointer text-sm">Gerir cartões</summary><div className="mt-2 space-y-2">{cards.filter(c => module === "Todos" || (c.module || "Geral") === module).map(c => <div key={c.id} className="flex items-center justify-between gap-3 border-b py-2 text-sm"><span>{c.question}</span><Button variant="ghost" size="sm" onClick={() => setCards(old => old.filter(x => x.id !== c.id))}>Apagar</Button></div>)}</div></details>}
    </section>
    <section className="space-y-4 rounded-2xl border bg-card p-5">
      <h2 className="text-xl font-bold">Plano de estudo</h2>
      <p className="text-sm text-muted-foreground">{goals.filter(g => g.done).length} de {goals.length} objetivos concluídos</p>
      <div className="flex gap-2"><Input value={goal} onChange={e => setGoal(e.target.value)} placeholder="Ex.: Rever anatomia do sistema digestivo" onKeyDown={e => { if(e.key === "Enter" && goal.trim()) { setGoals(old => [...old, { id: crypto.randomUUID(), text: goal.trim(), done: false }]); setGoal(""); } }} /><Button disabled={!goal.trim()} onClick={() => { setGoals(old => [...old, { id: crypto.randomUUID(), text: goal.trim(), done: false }]); setGoal(""); }}>Adicionar</Button></div>
      {goals.map(g => <div key={g.id} className="flex items-center gap-3"><input type="checkbox" checked={g.done} onChange={e => setGoals(old => old.map(x => x.id === g.id ? { ...x, done: e.target.checked } : x))} aria-label={g.text}/><span className={g.done ? "flex-1 line-through text-muted-foreground" : "flex-1"}>{g.text}</span><Button size="sm" variant="ghost" onClick={() => setGoals(old => old.filter(x => x.id !== g.id))}>Apagar</Button></div>)}
    </section>
    <section className="space-y-4 rounded-2xl border bg-card p-5"><div><h2 className="text-xl font-bold">Cópia de segurança do estudo</h2><p className="mt-1 text-sm text-muted-foreground">Exporta os cartões e objetivos para um ficheiro JSON. Podes importá-lo noutro dispositivo; a importação acrescenta os dados sem apagar os atuais.</p></div><input ref={importRef} type="file" accept=".json,application/json" className="sr-only" aria-label="Selecionar cópia de segurança" onChange={e => void importBackup(e.target.files?.[0])} /><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!loaded} onClick={exportBackup}><Download className="mr-2 h-4 w-4"/>Exportar</Button><Button variant="outline" disabled={!loaded} onClick={() => importRef.current?.click()}><Upload className="mr-2 h-4 w-4"/>Importar</Button></div></section>
    <section className="rounded-2xl border bg-card p-5"><h2 className="text-xl font-bold">Outras ferramentas</h2><p className="my-3 text-sm text-muted-foreground">Consulta o dicionário veterinário, os teus PDFs e o tutor de IA.</p><div className="flex flex-wrap gap-3"><Link className="text-primary underline" to="/dicionario">Dicionário</Link><Link className="text-primary underline" to="/materiais">Materiais</Link><Link className="text-primary underline" to="/tutor">Tutor IA</Link></div></section>
  </div>;
}
