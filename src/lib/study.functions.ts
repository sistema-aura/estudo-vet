import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SYSTEM =
  "És um tutor especializado em auxiliar de veterinária. Responde sempre em português de Portugal, de forma clara, didática e rigorosa. Baseia-te apenas no material fornecido quando ele existir.";

async function getMaterial(supabase: any, id: string) {
  const { data, error } = await supabase.from("materials").select("*").eq("id", id).single();
  if (error || !data) throw new Error("Material não encontrado.");
  return data as { id: string; title: string; content: string };
}

export const summarizeMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { aiText } = await import("./ai.server");
    const m = await getMaterial(context.supabase, data.id);
    if (!m.content.trim()) throw new Error("Este material não tem texto para resumir.");
    const summary = await aiText(
      SYSTEM,
      `Faz um resumo de estudo estruturado em Markdown (títulos, tópicos, termos-chave a negrito, e uma secção final "Pontos a decorar") do material "${m.title}":\n\n${m.content.slice(0, 120000)}`,
    );
    await context.supabase.from("materials").update({ summary }).eq("id", m.id);
    return { summary };
  });

const quizSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      correctIndex: z.number(),
      explanation: z.string(),
    }),
  ),
});

export const generateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; count: number }) =>
    z.object({ id: z.string().uuid(), count: z.number().int().min(3).max(15) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { aiObject } = await import("./ai.server");
    const m = await getMaterial(context.supabase, data.id);
    if (!m.content.trim()) throw new Error("Este material não tem texto para gerar perguntas.");
    return await aiObject(
      SYSTEM,
      `Cria ${data.count} perguntas de escolha múltipla (4 opções cada) sobre o material "${m.title}". Varia a dificuldade. Indica o índice (0-3) da resposta correta e uma explicação curta.\n\n${m.content.slice(0, 120000)}`,
      quizSchema,
    );
  });

export const askTutor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { question: string; materialId?: string }) =>
    z.object({ question: z.string().min(1).max(4000), materialId: z.string().uuid().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { aiText } = await import("./ai.server");
    let ctx = "";
    if (data.materialId) {
      const m = await getMaterial(context.supabase, data.materialId);
      ctx = `Material de referência "${m.title}":\n${m.content.slice(0, 100000)}\n\n`;
    }
    const answer = await aiText(SYSTEM, `${ctx}Pergunta do aluno: ${data.question}`);
    return { answer };
  });
