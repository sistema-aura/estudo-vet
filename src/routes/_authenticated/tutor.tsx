import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Send, Copy, Sparkles, MessageCircleQuestion, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { askTutor } from "@/lib/study.functions";
import { Markdown } from "@/components/Markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/tutor")({
  head: () => ({ meta: [{ title: "Tutor IA — VetEstudo" }, { name: "description", content: "Tira dúvidas com o tutor IA." }] }),
  component: Tutor,
});

const suggestions = [
  "Explica o trajeto do sangue através do coração do cão.",
  "Quais são as diferenças anatómicas mais importantes entre cão e gato?",
  "Faz-me 5 perguntas de revisão sobre o sistema urinário.",
  "Ajuda-me a criar um plano de revisão para um exame de anatomia.",
];

function Tutor() {
  const ask = useServerFn(askTutor);
  const [question, setQuestion] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<{ q: string; a: string }[]>([]);
  const { data: materials = [] } = useQuery({
    queryKey: ["materials", "tutor-picker"],
    queryFn: async () => (await supabase.from("materials").select("id,title,subject").order("title")).data ?? [],
  });

  async function copyAnswer(answer: string) {
    try { await window.navigator.clipboard.writeText(answer); toast.success("Resposta copiada."); }
    catch { toast.error("Não foi possível copiar automaticamente."); }
  }

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
      <div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><MessageCircleQuestion className="h-6 w-6"/></span><div><h1 className="text-3xl font-bold">Tutor IA</h1><p className="mt-1 text-muted-foreground">Faz uma pergunta. Escolhe um PDF para a resposta se basear nele, ou usa o conhecimento geral.</p></div></div>
      <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">As respostas podem conter erros. Confirma sempre informação clínica e farmacológica em fontes veterinárias fiáveis. O tutor é uma ferramenta de estudo, não um serviço de diagnóstico.</div>
      {history.length === 0 && <section className="mt-6 space-y-3"><h2 className="flex items-center gap-2 text-sm font-bold"><Sparkles className="h-4 w-4 text-primary"/> Precisas de inspiração?</h2><div className="grid gap-2 sm:grid-cols-2">{suggestions.map(text => <button type="button" key={text} onClick={() => setQuestion(text)} className="rounded-xl border bg-card p-4 text-left text-sm transition hover:border-primary/60 hover:bg-muted">{text}</button>)}</div></section>}
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
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{question.length}/4000 caracteres</p><Button onClick={() => void send()} disabled={busy || !question.trim()}><Send className="mr-2 h-4 w-4" />{busy ? "A preparar resposta…" : "Perguntar"}</Button></div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-muted-foreground">Enter para enviar · Shift+Enter para nova linha · O tutor usa até 6 mensagens anteriores como contexto nesta sessão.</span>{history.length > 0 && <Button size="sm" variant="outline" onClick={() => setHistory([])}><RotateCcw className="mr-1.5 h-3.5 w-3.5"/>Nova conversa</Button>}</div>
      <div className="mt-6 space-y-4">
        {history.map((h, i) => (
          <div key={i} className="rounded-2xl border bg-card p-5">
            <div className="flex items-start gap-3"><span className="rounded-lg bg-primary/10 p-2 text-primary"><MessageCircleQuestion size={16}/></span><p className="flex-1 font-semibold">{h.q}</p></div>
            <div className="mt-4 border-t pt-4"><Markdown>{h.a}</Markdown></div>
            <div className="mt-4 flex justify-end border-t pt-3"><Button size="sm" variant="outline" onClick={() => void copyAnswer(h.a)}><Copy className="mr-1.5 h-3.5 w-3.5"/>Copiar resposta</Button></div>
          </div>
        ))}
      </div>
    </div>
  );
}
