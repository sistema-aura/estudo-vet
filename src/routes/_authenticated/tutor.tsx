import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { askTutor } from "@/lib/study.functions";
import { Markdown } from "@/components/Markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/tutor")({
  head: () => ({ meta: [{ title: "Tutor IA — VetEstudo" }, { name: "description", content: "Tira dúvidas com o tutor IA." }] }),
  component: Tutor,
});

function Tutor() {
  const ask = useServerFn(askTutor);
  const [question, setQuestion] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<{ q: string; a: string }[]>([]);
  const { data: materials = [] } = useQuery({
    queryKey: ["materials"],
    queryFn: async () => (await supabase.from("materials").select("id,title,subject").order("title")).data ?? [],
  });

  async function send() {
    if (!question.trim() || busy) return;
    setBusy(true);
    try {
      const { answer } = await ask({ data: { question: question.trim(), materialId: materialId || undefined, history: history.slice(0, 6).reverse() } });
      setHistory(prev => [{ q: question.trim(), a: answer }, ...prev]);
      setQuestion("");
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao obter resposta");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold">Tutor IA</h1>
      <p className="mt-1 text-muted-foreground">Faz uma pergunta. Escolhe um material para a resposta se basear nele.</p>
      <div className="mt-6 space-y-3 rounded-2xl border bg-card p-5">
        <select
          value={materialId}
          onChange={(e) => { setMaterialId(e.target.value); setHistory([]); }}
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
        >
          <option value="">Sem material (conhecimento geral)</option>
          {materials.map((m) => <option key={m.id} value={m.id}>{m.subject} — {m.title}</option>)}
        </select>
        <Textarea
          rows={3}
          placeholder="ex.: Quais são os sinais vitais normais de um gato?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={4000}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }}
        />
        <Button onClick={() => void send()} disabled={busy || !question.trim()}><Send className="mr-2 h-4 w-4" />{busy ? "A pensar…" : "Perguntar"}</Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2"><span className="text-xs text-muted-foreground">Enter para enviar · Shift+Enter para nova linha · O Tutor mantém o contexto das últimas 6 perguntas nesta sessão.</span>{history.length > 0 && <Button size="sm" variant="outline" onClick={() => setHistory([])}>Nova conversa</Button>}</div>
      <div className="mt-6 space-y-4">
        {history.map((h, i) => (
          <div key={i} className="rounded-2xl border bg-card p-5">
            <p className="font-semibold">{h.q}</p>
            <div className="mt-3 border-t pt-3"><Markdown>{h.a}</Markdown></div>
          </div>
        ))}
      </div>
    </div>
  );
}
