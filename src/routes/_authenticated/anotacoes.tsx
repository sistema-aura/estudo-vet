import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/anotacoes")({
  head: () => ({ meta: [{ title: "Anotações — VetEstudo" }, { name: "description", content: "As tuas anotações de estudo." }] }),
  component: Anotacoes,
});

function Anotacoes() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [q, setQ] = useState("");
  const { data: notes = [] } = useQuery({
    queryKey: ["notes", "all"],
    queryFn: async () => (await supabase.from("notes").select("*, materials(id,title)").order("created_at", { ascending: false })).data ?? [],
  });
  const filtered = notes.filter((n) => (n.title + n.content).toLowerCase().includes(q.toLowerCase()));

  async function save() {
    if (!content.trim()) return;
    const { error } = await supabase.from("notes").insert({ title: title || "Sem título", content });
    if (error) { toast.error(error.message); return; }
    setTitle("");
    setContent("");
    qc.invalidateQueries({ queryKey: ["notes"] });
  }
  async function del(id: string) {
    await supabase.from("notes").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["notes"] });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-bold">Anotações</h1>
      <div className="mt-6 space-y-3 rounded-2xl border bg-card p-5">
        <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea placeholder="Escreve aqui…" rows={5} value={content} onChange={(e) => setContent(e.target.value)} />
        <Button onClick={save}>Guardar</Button>
      </div>
      <div className="relative mt-6">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Procurar nas anotações…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {filtered.map((n: any) => (
          <div key={n.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold">{n.title}</h3>
              <button onClick={() => del(n.id)} aria-label="Apagar" className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{n.content}</p>
            {n.materials && (
              <Link to="/materiais/$id" params={{ id: n.materials.id }} className="mt-2 inline-block text-xs text-primary">
                📄 {n.materials.title}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
