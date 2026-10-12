import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/dicionario")({
  head: () => ({ meta: [{ title: "Dicionário — VetEstudo" }, { name: "description", content: "O teu dicionário de termos veterinários." }] }),
  component: Dicionario,
});

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function Dicionario() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [def, setDef] = useState("");
  const [open, setOpen] = useState(false);
  const { data: words = [] } = useQuery({
    queryKey: ["glossary"],
    queryFn: async () => (await supabase.from("glossary").select("*").order("term")).data ?? [],
  });

  const results = useMemo(() => {
    const n = norm(q.trim());
    if (!n) return words;
    const byTerm = words.filter((w) => norm(w.term).includes(n));
    const byDef = words.filter((w) => !byTerm.includes(w) && norm(w.definition).includes(n));
    return [...byTerm.sort((a, b) => Number(!norm(a.term).startsWith(n)) - Number(!norm(b.term).startsWith(n))), ...byDef];
  }, [words, q]);

  async function add() {
    if (!term.trim()) return;
    const { error } = await supabase.from("glossary").insert({ term: term.trim(), definition: def.trim() });
    if (error) return toast.error(error.message);
    setTerm("");
    setDef("");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["glossary"] });
  }
  async function del(id: string) {
    await supabase.from("glossary").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["glossary"] });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dicionário</h1>
        <Button onClick={() => setOpen(!open)}><Plus className="mr-1 h-4 w-4" /> Novo termo</Button>
      </div>
      {open && (
        <div className="mt-4 space-y-3 rounded-2xl border bg-card p-5">
          <Input placeholder="Termo (ex.: Anamnese)" value={term} onChange={(e) => setTerm(e.target.value)} />
          <Textarea placeholder="Significado" rows={3} value={def} onChange={(e) => setDef(e.target.value)} />
          <Button onClick={add}>Adicionar</Button>
        </div>
      )}
      <div className="relative mt-6">
        <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
        <Input className="h-11 pl-10 text-base" placeholder="Pesquisar palavra…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{results.length} de {words.length} termos</p>
      <dl className="mt-4 divide-y rounded-2xl border bg-card">
        {results.map((w) => (
          <div key={w.id} className="group flex items-start justify-between gap-3 p-4">
            <div>
              <dt className="font-display text-lg font-bold text-primary">{w.term}</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm">{w.definition}</dd>
            </div>
            <button onClick={() => del(w.id)} aria-label="Apagar" className="text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {results.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nenhum termo encontrado.</p>}
      </dl>
    </div>
  );
}
