import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  const [cards, setCards] = useState<Card[]>(() => read("vetestudo-flashcards-v1", []));
  const [goals, setGoals] = useState<Goal[]>(() => read("vetestudo-goals-v1", []));
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [goal, setGoal] = useState("");
  const [show, setShow] = useState<string | null>(null);
  const [module, setModule] = useState("Geral");
  useEffect(() => { try { localStorage.setItem("vetestudo-flashcards-v1", JSON.stringify(cards)); } catch {} }, [cards]);
  useEffect(() => { try { localStorage.setItem("vetestudo-goals-v1", JSON.stringify(goals)); } catch {} }, [goals]);
  const due = cards.filter(c => (module === "Todos" || (c.module || "Geral") === module) && c.due <= Date.now()).sort((a,b) => a.due - b.due);
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
    <section className="rounded-2xl border bg-card p-5"><h2 className="text-xl font-bold">Outras ferramentas</h2><p className="my-3 text-sm text-muted-foreground">Consulta o dicionário veterinário, os teus PDFs e o tutor de IA.</p><div className="flex flex-wrap gap-3"><Link className="text-primary underline" to="/dicionario">Dicionário</Link><Link className="text-primary underline" to="/materiais">Materiais</Link><Link className="text-primary underline" to="/tutor">Tutor IA</Link></div></section>
  </div>;
}
