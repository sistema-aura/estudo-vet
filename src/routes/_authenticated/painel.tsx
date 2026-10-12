import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookA, BookOpen, MessageCircleQuestion, NotebookPen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({ meta: [{ title: "Painel — VetEstudo" }, { name: "description", content: "Resumo do teu estudo." }] }),
  component: Painel,
});

async function count(table: "materials" | "notes" | "glossary") {
  const { count } = await supabase.from(table).select("id", { count: "exact", head: true });
  return count ?? 0;
}

function Painel() {
  const { data } = useQuery({
    queryKey: ["counts"],
    queryFn: async () => ({ m: await count("materials"), n: await count("notes"), g: await count("glossary") }),
  });
  const { data: recent } = useQuery({
    queryKey: ["materials", "recent"],
    queryFn: async () => (await supabase.from("materials").select("id,title,subject").order("created_at", { ascending: false }).limit(5)).data ?? [],
  });

  const cards = [
    { to: "/materiais", label: "Materiais", n: data?.m, icon: BookOpen },
    { to: "/anotacoes", label: "Anotações", n: data?.n, icon: NotebookPen },
    { to: "/dicionario", label: "Termos no dicionário", n: data?.g, icon: BookA },
  ] as const;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-bold">Olá! Bom estudo 🐾</h1>
      <p className="mt-1 text-muted-foreground">Continua onde ficaste.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.to} to={c.to} className="rounded-2xl border bg-card p-5 transition hover:border-primary">
            <c.icon className="h-5 w-5 text-primary" />
            <div className="mt-3 font-display text-3xl font-bold">{c.n ?? "–"}</div>
            <div className="text-sm text-muted-foreground">{c.label}</div>
          </Link>
        ))}
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-bold">Materiais recentes</h2>
          <ul className="mt-3 space-y-2">
            {recent?.length ? (
              recent.map((m) => (
                <li key={m.id}>
                  <Link to="/materiais/$id" params={{ id: m.id }} className="block rounded-lg px-2 py-1.5 hover:bg-muted">
                    <span className="font-medium">{m.title}</span>{" "}
                    <span className="text-xs text-muted-foreground">· {m.subject}</span>
                  </Link>
                </li>
              ))
            ) : (
              <li className="text-sm text-muted-foreground">Ainda não carregaste nenhum PDF.</li>
            )}
          </ul>
        </div>
        <Link to="/tutor" className="rounded-2xl bg-primary p-5 text-primary-foreground">
          <MessageCircleQuestion className="h-6 w-6" />
          <h2 className="mt-3 text-lg font-bold">Tens uma dúvida?</h2>
          <p className="text-sm opacity-90">Pergunta ao tutor IA — ele pode usar os teus materiais como referência.</p>
        </Link>
      </div>
    </div>
  );
}
