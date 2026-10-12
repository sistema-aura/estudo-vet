import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowRight, BookA, BookOpen, Bone, CheckCircle2, ChevronRight, ClipboardCheck, GraduationCap, MessageCircleQuestion, NotebookPen, Sparkles, Target, Clock3, LibraryBig } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({ meta: [{ title: "Painel — VetEstudo" }, { name: "description", content: "O teu centro de estudo veterinário." }] }),
  component: Painel,
});

type LocalStats = { due: number; cards: number; goals: number; done: number; exams: number; average: number | null };
type RecentMaterial = { id: string; title: string; subject: string };

async function count(table: "materials" | "notes" | "glossary") {
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

function readArray(key: string): Record<string, unknown>[] {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(raw) ? raw.filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v)) : [];
  } catch { return []; }
}

function readLocalStats(): LocalStats {
  const flashcards = readArray("vetestudo-flashcards-v1");
  const goals = readArray("vetestudo-goals-v1");
  const exams = readArray("vetestudo-exams-v1");
  const validExams = exams.filter(e => typeof e.correct === "number" && typeof e.total === "number" && e.total > 0);
  return {
    cards: flashcards.length,
    due: flashcards.filter(c => typeof c.due === "number" && c.due <= Date.now()).length,
    goals: goals.length,
    done: goals.filter(g => g.done === true).length,
    exams: validExams.length,
    average: validExams.length ? Math.round(validExams.reduce((s, e) => s + (e.correct as number) / (e.total as number) * 100, 0) / validExams.length) : null,
  };
}

const quickActions = [
  { to: "/estudo", label: "Rever flashcards", description: "Memorizar e consolidar", icon: GraduationCap, accent: "text-blue-400" },
  { to: "/materiais", label: "Abrir materiais", description: "PDFs e módulos", icon: BookOpen, accent: "text-cyan-400" },
  { to: "/exames", label: "Treinar para exames", description: "Perguntas e resultados", icon: ClipboardCheck, accent: "text-violet-400" },
  { to: "/atlas", label: "Explorar anatomia", description: "Cão e gato", icon: Bone, accent: "text-amber-400" },
] as const;

function Painel() {
  const [local, setLocal] = useState<LocalStats | null>(null);
  useEffect(() => { setLocal(readLocalStats()); }, []);

  const { data: totals, isPending: totalsPending, isError: totalsError } = useQuery({
    queryKey: ["counts"],
    queryFn: async () => {
      const [materials, notes, glossary] = await Promise.all([count("materials"), count("notes"), count("glossary")]);
      return { materials, notes, glossary };
    },
  });
  const { data: recent = [], isPending: recentPending, isError: recentError } = useQuery({
    queryKey: ["materials", "recent"],
    queryFn: async (): Promise<RecentMaterial[]> => {
      const { data, error } = await supabase.from("materials").select("id,title,subject").order("created_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const cards = [
    { to: "/materiais", label: "PDFs na biblioteca", n: totals?.materials, icon: BookOpen },
    { to: "/anotacoes", label: "Notas guardadas", n: totals?.notes, icon: NotebookPen },
    { to: "/dicionario", label: "Termos no dicionário", n: totals?.glossary, icon: BookA },
  ] as const;
  const donePercent = local?.goals ? Math.round(local.done / local.goals * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-blue-400/20 bg-gradient-to-br from-[#123b79] via-[#0c2952] to-[#091a31] px-6 py-9 text-white shadow-xl shadow-black/5 sm:px-9 sm:py-10">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full border-[35px] border-blue-400/10" />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-20 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-300/30 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold text-blue-100"><Sparkles size={14} /> O teu espaço de aprendizagem</div>
          <h1 className="max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">Tudo pronto para mais uma sessão de estudo?</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-blue-100/85 sm:text-base">Organiza os materiais, pratica os conhecimentos e acompanha a tua evolução em medicina veterinária.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/estudo" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-[#0d2c55] transition hover:bg-blue-50">Começar a estudar <ArrowRight size={16} /></Link>
            <Link to="/atlas" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20">Explorar o Atlas <Bone size={16} /></Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="resumo-estudo" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="resumo-estudo" className="text-xl font-bold">O teu espaço, em números</h2><span className="text-xs text-muted-foreground">Biblioteca e dicionário</span></div>
        {totalsError && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-foreground">Não foi possível carregar os totais. Os teus dados não foram alterados.</p>}
        <div className="grid gap-3 sm:grid-cols-3">
          {cards.map(c => <Link key={c.to} to={c.to} className="group rounded-2xl border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg">
            <div className="flex items-start justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><c.icon size={21}/></span><ChevronRight size={18} className="text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary"/></div>
            <div className="mt-4 text-3xl font-extrabold tabular-nums">{totalsPending || totalsError ? "—" : c.n ?? 0}</div>
            <p className="mt-1 text-sm text-muted-foreground">{c.label}</p>
          </Link>)}
        </div>
      </section>

      <section aria-labelledby="acessos-rapidos" className="space-y-3">
        <h2 id="acessos-rapidos" className="text-xl font-bold">Acessos rápidos</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map(action => <Link key={action.to} to={action.to} className="group flex items-center gap-3 rounded-2xl border bg-card p-4 transition hover:border-primary/60 hover:shadow-md">
            <span className="rounded-xl bg-muted p-3"><action.icon size={22} className={action.accent} /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{action.label}</span><span className="block text-xs text-muted-foreground">{action.description}</span></span><ArrowRight size={16} className="shrink-0 text-muted-foreground group-hover:text-primary"/>
          </Link>)}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
        <section className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6" aria-labelledby="progresso-local">
          <div className="flex items-start justify-between gap-3"><div><h2 id="progresso-local" className="flex items-center gap-2 text-lg font-bold"><Target size={19} className="text-primary"/> Plano e progresso</h2><p className="mt-1 text-xs text-muted-foreground">Indicadores guardados neste dispositivo</p></div><Link to="/estudo" className="text-xs font-semibold text-primary hover:underline">Abrir plano →</Link></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-muted p-3"><Clock3 size={18} className="text-primary"/><p className="mt-2 text-2xl font-bold tabular-nums">{local?.due ?? "—"}</p><p className="text-xs text-muted-foreground">Flashcards a rever</p></div>
            <div className="rounded-xl bg-muted p-3"><CheckCircle2 size={18} className="text-primary"/><p className="mt-2 text-2xl font-bold tabular-nums">{local ? local.done + "/" + local.goals : "—"}</p><p className="text-xs text-muted-foreground">Objetivos concluídos</p></div>
            <div className="rounded-xl bg-muted p-3"><ClipboardCheck size={18} className="text-primary"/><p className="mt-2 text-2xl font-bold tabular-nums">{local?.average == null ? "—" : local.average + "%"}</p><p className="text-xs text-muted-foreground">Média em exames</p></div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-xs"><span className="text-muted-foreground">Progresso dos objetivos</span><span className="font-bold">{local?.goals ? donePercent + "%" : "Sem objetivos ainda"}</span></div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Objetivos concluídos" aria-valuenow={donePercent} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-primary transition-all" style={{width:donePercent+"%"}} /></div>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">{local?.due ? "Tens cartões à espera de revisão — alguns minutos hoje podem fazer a diferença." : "Regista um objetivo ou cria um flashcard para começares a acompanhar o estudo."}</p>
        </section>

        <section className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6" aria-labelledby="recentes">
          <div className="flex items-start justify-between gap-3"><div><h2 id="recentes" className="flex items-center gap-2 text-lg font-bold"><LibraryBig size={19} className="text-primary"/> Materiais recentes</h2><p className="mt-1 text-xs text-muted-foreground">Retoma a leitura dos teus PDFs</p></div><Link to="/materiais" className="text-xs font-semibold text-primary hover:underline">Ver biblioteca →</Link></div>
          {recentPending ? <p className="py-6 text-center text-sm text-muted-foreground">A carregar materiais…</p> : recentError ? <p className="rounded-lg border p-4 text-sm text-muted-foreground">Não foi possível carregar os materiais recentes.</p> : recent.length ? <ul className="divide-y divide-border">{recent.map(m => <li key={m.id}><Link to="/materiais/$id" params={{id:m.id}} className="group flex items-center gap-3 rounded-lg py-3 transition hover:text-primary"><span className="rounded-lg bg-primary/10 p-2 text-primary"><BookOpen size={17}/></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{m.title}</span><span className="block truncate text-xs text-muted-foreground">{m.subject}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary"/></Link></li>)}</ul> : <div className="rounded-xl border border-dashed p-6 text-center"><BookOpen size={28} className="mx-auto text-muted-foreground"/><p className="mt-3 text-sm font-semibold">Ainda não carregaste PDFs</p><p className="mt-1 text-xs text-muted-foreground">Começa pela biblioteca de materiais.</p><Link to="/materiais" className="mt-3 inline-block text-sm font-semibold text-primary underline">Carregar primeiro PDF</Link></div>}
        </section>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/tutor" className="group flex items-center gap-4 rounded-2xl border bg-card p-5 transition hover:border-primary/60"><span className="rounded-xl bg-primary/10 p-3 text-primary"><MessageCircleQuestion size={23}/></span><span className="flex-1"><span className="block font-bold">Tens uma dúvida?</span><span className="block text-sm text-muted-foreground">Pergunta ao Tutor IA com os teus materiais como referência.</span></span><ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary"/></Link>
        <Link to="/dicionario" className="group flex items-center gap-4 rounded-2xl border bg-card p-5 transition hover:border-primary/60"><span className="rounded-xl bg-primary/10 p-3 text-primary"><BookA size={23}/></span><span className="flex-1"><span className="block font-bold">Termos que precisas de recordar</span><span className="block text-sm text-muted-foreground">Consulta definições e revê vocabulário veterinário.</span></span><ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary"/></Link>
      </div>
    </div>
  );
}
