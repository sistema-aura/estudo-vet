import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/exames")({
  head: () => ({ meta: [{ title: "Exames e estatísticas — VetEstudo" }] }),
  component: Exames,
});

type Area = "Anatomia" | "Fisiologia" | "Clínica" | "Farmacologia";
type Question = { id: number; area: Area; q: string; options: [string, string, string, string]; correct: number; why: string };
const BANK: Question[] = [
  { id: 1, area: "Anatomia", q: "Qual é o osso da coxa dos mamíferos domésticos?", options: ["Úmero", "Fémur", "Rádio", "Tíbia"], correct: 1, why: "O fémur é o osso longo da coxa, entre a articulação coxofemoral e o joelho." },
  { id: 2, area: "Anatomia", q: "Que estrutura separa as cavidades torácica e abdominal?", options: ["Peritoneu", "Diafragma", "Pleura", "Mediastino"], correct: 1, why: "O diafragma é o músculo que separa o tórax do abdómen e participa na inspiração." },
  { id: 3, area: "Anatomia", q: "Qual é a principal função da coluna vertebral?", options: ["Produzir bílis", "Filtrar o sangue", "Proteger a medula espinal", "Produzir insulina"], correct: 2, why: "O canal vertebral aloja e protege a medula espinal." },
  { id: 4, area: "Anatomia", q: "Qual destas estruturas pertence ao membro torácico?", options: ["Escápula", "Fémur", "Patela", "Társico"], correct: 0, why: "A escápula é um osso da cintura do membro torácico." },
  { id: 5, area: "Fisiologia", q: "Onde ocorrem principalmente as trocas gasosas nos pulmões?", options: ["Traqueia", "Alvéolos", "Laringe", "Faringe"], correct: 1, why: "As trocas de oxigénio e dióxido de carbono ocorrem na membrana alvéolo-capilar." },
  { id: 6, area: "Fisiologia", q: "Qual é a principal função dos rins?", options: ["Produzir bílis", "Filtrar o sangue e regular o equilíbrio hídrico", "Produzir enzimas digestivas", "Armazenar glicose"], correct: 1, why: "Os rins eliminam produtos de excreção e regulam água, eletrólitos e equilíbrio ácido-base." },
  { id: 7, area: "Fisiologia", q: "Que hormona diminui a glicemia?", options: ["Adrenalina", "Glucagina", "Insulina", "Cortisol"], correct: 2, why: "A insulina promove a captação e armazenamento de glicose, reduzindo a glicemia." },
  { id: 8, area: "Fisiologia", q: "Qual é a função principal dos eritrócitos?", options: ["Coagulação", "Defesa imunitária", "Transporte de oxigénio", "Produção de anticorpos"], correct: 2, why: "A hemoglobina dos eritrócitos transporta a maior parte do oxigénio no sangue." },
  { id: 9, area: "Clínica", q: "O que significa anamnese em contexto clínico?", options: ["Cirurgia exploratória", "Recolha da história clínica", "Análise de urina", "Medição da pressão arterial"], correct: 1, why: "A anamnese recolhe informações sobre o historial, sinais e evolução do problema do animal." },
  { id: 10, area: "Clínica", q: "Qual é a primeira atitude perante um animal com dificuldade respiratória grave?", options: ["Esperar pela próxima consulta", "Reduzir o stress e procurar assistência veterinária imediata", "Dar alimento", "Forçar exercício"], correct: 1, why: "A dificuldade respiratória grave é uma emergência e requer intervenção veterinária rápida." },
  { id: 11, area: "Clínica", q: "O que avalia principalmente o tempo de repleção capilar?", options: ["Visão", "Perfusão periférica", "Audição", "Função hepática"], correct: 1, why: "O tempo de repleção capilar ajuda a avaliar a perfusão periférica, em conjunto com outros sinais clínicos." },
  { id: 12, area: "Clínica", q: "Qual é a finalidade da assepsia?", options: ["Aumentar a temperatura", "Reduzir o risco de contaminação por microrganismos", "Aumentar a frequência cardíaca", "Estimular o apetite"], correct: 1, why: "A assepsia reúne medidas para prevenir a contaminação por microrganismos." },
  { id: 13, area: "Farmacologia", q: "O que significa via subcutânea?", options: ["Administração na veia", "Administração sob a pele", "Administração por inalação", "Administração oral"], correct: 1, why: "A administração subcutânea é realizada no tecido situado sob a pele." },
  { id: 14, area: "Farmacologia", q: "O que é uma contraindicação?", options: ["Uma indicação obrigatória", "Uma situação em que o uso de um tratamento pode ser inadequado ou perigoso", "Uma dose máxima universal", "Uma marca comercial"], correct: 1, why: "Uma contraindicação é uma condição que desaconselha ou impede determinado tratamento." },
  { id: 15, area: "Farmacologia", q: "Quem deve definir a prescrição de medicamentos sujeitos a receita veterinária?", options: ["Qualquer tutor", "Um médico veterinário", "O fornecedor de ração", "Qualquer funcionário"], correct: 1, why: "A prescrição de medicamentos veterinários sujeitos a receita é responsabilidade do médico veterinário." },
  { id: 16, area: "Farmacologia", q: "O que é um efeito adverso de um medicamento?", options: ["Um benefício esperado", "Uma reação indesejada associada ao medicamento", "A sua forma farmacêutica", "O prazo de validade"], correct: 1, why: "Um efeito adverso é uma reação nociva ou indesejada associada à utilização de um medicamento." },
];
type Result = { id: string; at: number; area: string; correct: number; total: number; seconds: number; wrong: number[] };
const KEY = "vetestudo-exams-v1";
function readResults(): Result[] {
  if (typeof window === "undefined") return [];
  try { const parsed: unknown = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}
function Exames() {
  const [area, setArea] = useState<Area | "Todas">("Todas");
  const [count, setCount] = useState(10);
  const [duration, setDuration] = useState(15);
  const [session, setSession] = useState<{ questions: Question[]; started: number; answers: Record<number, number> } | null>(null);
  const [finished, setFinished] = useState<Result | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [resultsLoaded, setResultsLoaded] = useState(false);
  const [reviewMistakes, setReviewMistakes] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!session) return; const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, [session]);
  useEffect(() => { setResults(readResults()); setResultsLoaded(true); }, []);
  useEffect(() => { if (!resultsLoaded) return; try { localStorage.setItem(KEY, JSON.stringify(results)); } catch {} }, [results, resultsLoaded]);
  const mistakes = useMemo(() => new Set(results.flatMap(r => r.wrong)), [results]);
  const pool = useMemo(() => BANK.filter(q => (area === "Todas" || q.area === area) && (!reviewMistakes || mistakes.has(q.id))), [area, reviewMistakes, mistakes]);
  const elapsed = session ? Math.max(0, Math.floor((now - session.started) / 1000)) : 0;
  const remaining = Math.max(0, duration * 60 - elapsed);
  function finish(current: NonNullable<typeof session>) {
    const correct = current.questions.filter(q => current.answers[q.id] === q.correct).length;
    const result: Result = { id: crypto.randomUUID(), at: Date.now(), area, correct, total: current.questions.length, seconds: Math.floor((Date.now() - current.started) / 1000), wrong: current.questions.filter(q => current.answers[q.id] !== q.correct).map(q => q.id) };
    setResults(old => [result, ...old]); setFinished(result); setSession(null);
  }
  useEffect(() => {
    if (!session || remaining > 0) return;
    finish(session);
  // The exam is intentionally finalized when the countdown reaches zero.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, session]);
  const attempts = results.length;
  const avg = attempts ? Math.round(results.reduce((sum, r) => sum + r.correct / r.total * 100, 0) / attempts) : 0;
  const best = attempts ? Math.max(...results.map(r => Math.round(r.correct / r.total * 100))) : 0;
  const current = session?.questions ?? [];
  return <div className="mx-auto max-w-5xl space-y-6">
    <div><h1 className="text-3xl font-bold">Exames simulados</h1><p className="mt-1 text-sm text-muted-foreground">Treina com perguntas de escolha múltipla, cronómetro, correção e estatísticas. Banco inicial de {BANK.length} perguntas de revisão.</p></div>
    <div className="grid gap-3 sm:grid-cols-3">
      {[["Exames realizados", String(attempts)], ["Média de acertos", attempts ? avg + "%" : "—"], ["Melhor resultado", attempts ? best + "%" : "—"]].map(([label, value]) => <div key={label} className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}
    </div>
    {!session && !finished && <section className="space-y-4 rounded-2xl border bg-card p-5">
      <h2 className="text-xl font-semibold">Preparar exame</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-sm">Área<select value={area} onChange={e => setArea(e.target.value as Area | "Todas")} className="block w-full rounded-md border bg-background p-2"><option>Todas</option>{(["Anatomia","Fisiologia","Clínica","Farmacologia"] as Area[]).map(a => <option key={a}>{a}</option>)}</select></label>
        <label className="space-y-1 text-sm">Perguntas<select value={count} onChange={e => setCount(Number(e.target.value))} className="block w-full rounded-md border bg-background p-2">{[5,10,15].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
        <label className="space-y-1 text-sm">Tempo<select value={duration} onChange={e => setDuration(Number(e.target.value))} className="block w-full rounded-md border bg-background p-2">{[5,10,15,30].map(n => <option key={n} value={n}>{n} minutos</option>)}</select></label>
      </div>
      {resultsLoaded && mistakes.size > 0 && <label className="flex items-center gap-2 rounded-xl border bg-muted/30 p-3 text-sm"><input type="checkbox" checked={reviewMistakes} onChange={e => setReviewMistakes(e.target.checked)} /> Treinar apenas perguntas erradas anteriormente ({mistakes.size} disponíveis)</label>}
      <p className="text-xs text-muted-foreground">Estão disponíveis {pool.length} perguntas nesta seleção. O exame utilizará até {Math.min(count, pool.length)} perguntas, sem repetições na mesma tentativa.</p>
      {reviewMistakes && pool.length === 0 && <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">Não tens perguntas erradas nesta área. Escolhe outra área ou desativa a revisão de erros.</p>}
      <Button disabled={pool.length === 0 || !resultsLoaded} onClick={() => { const shuffled = [...pool]; for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const chosen = shuffled[i]!; shuffled[i] = shuffled[j]!; shuffled[j] = chosen; } setSession({ questions: shuffled.slice(0, count), started: Date.now(), answers: {} }); setNow(Date.now()); }}>Iniciar exame</Button>
    </section>}
    {session && <section className="space-y-5">
      <div className="sticky top-0 z-10 flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm"><span className="font-semibold">Respondidas: {Object.keys(session.answers).length}/{current.length}</span><span className={remaining < 60 ? "font-bold text-destructive" : "font-bold"}>Tempo: {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</span></div>
      {current.map((q, i) => <div key={q.id} className="space-y-3 rounded-xl border bg-card p-5"><p className="font-semibold">{i+1}. {q.q}</p><div className="grid gap-2">{q.options.map((o, j) => <label key={j} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm hover:bg-muted"><input type="radio" name={String(q.id)} checked={session.answers[q.id] === j} onChange={() => setSession(old => old ? { ...old, answers: { ...old.answers, [q.id]: j } } : old)} />{o}</label>)}</div></div>)}
      <Button onClick={() => finish(session)}>Terminar e corrigir</Button>
    </section>}
    {finished && <section className="space-y-4 rounded-2xl border bg-card p-5">
      <h2 className="text-2xl font-bold">Resultado: {finished.correct}/{finished.total} ({Math.round(finished.correct / finished.total * 100)}%)</h2>
      <p className="text-sm text-muted-foreground">Duração: {Math.floor(finished.seconds / 60)} min {finished.seconds % 60} s · {finished.wrong.length} respostas erradas ou por responder.</p>
      <h3 className="font-semibold">Rever as respostas</h3>
      {finished.wrong.map(id => { const q = BANK.find(q => q.id === id); return q ? <div key={id} className="rounded-lg border p-3"><p className="font-medium">{q.q}</p><p className="text-sm">Resposta correta: {q.options[q.correct]}</p><p className="text-sm text-muted-foreground">{q.why}</p></div> : null; })}
      {finished.wrong.length === 0 && <p className="text-sm">Parabéns! Acertaste todas as perguntas.</p>}
      <Button onClick={() => setFinished(null)}>Novo exame</Button>
    </section>}
    <section className="space-y-3 rounded-2xl border bg-card p-5"><h2 className="text-xl font-semibold">Histórico e evolução</h2>
      {results.length === 0 ? <p className="text-sm text-muted-foreground">Ainda não realizaste exames.</p> : <div className="space-y-3">{results.slice(0, 20).map(r => <div key={r.id} className="space-y-1"><div className="flex justify-between gap-2 text-sm"><span>{new Date(r.at).toLocaleDateString("pt-PT")} · {r.area}</span><strong>{Math.round(r.correct / r.total * 100)}% ({r.correct}/{r.total})</strong></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: Math.round(r.correct / r.total * 100) + "%" }} /></div></div>)}</div>}
    </section>
    <p className="text-xs text-muted-foreground">Resultados guardados apenas neste navegador. As perguntas são exemplos de treino e não substituem exames oficiais nem aconselhamento veterinário. Para perguntas sobre os teus PDFs, consulta também <Link to="/materiais" className="underline">Materiais</Link>.</p>
  </div>;
}
