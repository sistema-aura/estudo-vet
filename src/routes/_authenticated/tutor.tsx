import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Send, Copy, Sparkles, MessageCircleQuestion, RotateCcw, Activity, CircleAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { askTutor, checkAiConnection } from "@/lib/study.functions";
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
  const diagnose = useServerFn(checkAiConnection);
  const [question, setQuestion] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<"idle" | "ready" | "failed">("idle");
  const [aiError, setAiError] = useState("");
  const [history, setHistory] = useState<{ q: string; a: string }[]>([]);
  const { data: materials = [], isError: materialError } = useQuery({
    queryKey: ["materials", "tutor-picker"],
    queryFn: async () => (await supabase.from("materials").select("id,title,subject").order("title")).data ?? [],
  });

  async function testConnection() {
    if (checking || busy) return;
    setChecking(true);
    setAiError("");
    try {
      const result = await diagnose();
      if (!result.ok) throw new Error("O serviço de IA não confirmou o funcionamento.");
      setStatus("ready");
      toast.success("A ligação à IA está operacional.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível verificar a ligação à IA.";
      setAiError(message);
      setStatus("failed");
      toast.error(message);
    } finally {
      setChecking(false);
    }
  }

  async function copyAnswer(answer: string) {
    try { await window.navigator.clipboard.writeText(answer); toast.success("Resposta copiada."); }
    catch { toast.error("Não foi possível copiar automaticamente."); }
  }

  async function send() {
    if (!question.trim() || busy) return;
    setBusy(true);
    setAiError("");
    const asked = question.trim();
    try {
      const { answer } = await ask({ data: { question: asked, materialId: materialId || undefined, history: history.slice(0, 6).reverse() } });
      if (!answer?.trim()) throw new Error("A IA não devolveu uma resposta. Tenta novamente.");
      setStatus("ready");
      setHistory(prev => [{ q: asked, a: answer }, ...prev]);
      setQuestion("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao obter resposta da IA.";
      setAiError(message);
      setStatus("failed");
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><MessageCircleQuestion className="h-6 w-6"/></span><div><h1 className="text-3xl font-bold">Tutor IA</h1><p className="mt-1 text-muted-foreground">Faz uma pergunta. Escolhe um PDF para a resposta se basear nele, ou usa o conhecimento geral.</p></div></div>
      <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">O Tutor utiliza a API oficial da OpenAI, configurada no servidor do VetEstudo, com faturação independente dos créditos do Lovable. As respostas podem conter erros: confirma informação clínica em fontes veterinárias fiáveis. O tutor é uma ferramenta de estudo, não um serviço de diagnóstico.</div>
      {history.length === 0 && <section className="mt-6 space-y-3"><h2 className="flex items-center gap-2 text-sm font-bold"><Sparkles className="h-4 w-4 text-primary"/> Precisas de inspiração?</h2><div className="grid gap-2 sm:grid-cols-2">{suggestions.map(text => <button type="button" key={text} onClick={() => setQuestion(text)} className="rounded-xl border bg-card p-4 text-left text-sm transition hover:border-primary/60 hover:bg-muted">{text}</button>)}</div></section>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
        <div className="flex items-center gap-2 text-sm"><Activity className="h-4 w-4 text-primary"/>
          <span>{status === "ready" ? "Último teste da IA: operacional" : status === "failed" ? "Último pedido à IA: falhou" : "Ligação à IA ainda não testada nesta sessão"}</span>
        </div>
        <Button variant="outline" size="sm" disabled={checking || busy} onClick={() => void testConnection()}>
          {checking ? "A verificar…" : "Testar ligação IA"}
        </Button>
      </div>
      {aiError && <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0"/>{aiError}</p>}
      {materialError && <p role="alert" className="mt-3 text-sm text-muted-foreground">Não foi possível carregar a lista de PDFs. Podes continuar a usar o tutor sem selecionar um documento.</p>}
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
