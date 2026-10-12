import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

function db() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: key.startsWith("sb_") ? { fetch: (u: any, i: any = {}) => { const h = new Headers(i.headers); h.delete("Authorization"); h.set("apikey", key); return fetch(u, { ...i, headers: h }); } } : {},
  });
}

const SYSTEM =
  "És um tutor especializado em auxiliar de veterinária. Responde sempre em português de Portugal, de forma clara, didática e rigorosa. Baseia-te apenas no material fornecido quando ele existir.";

async function getMaterial(supabase: any, id: string) {
  const { data, error } = await supabase.from("materials").select("*").eq("id", id).single();
  if (error || !data) throw new Error("Material não encontrado.");
  return data as { id: string; title: string; content: string };
}

export const summarizeMaterial = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { aiText } = await import("./ai.server");
    const m = await getMaterial(db(), data.id);
    if (!m.content.trim()) throw new Error("Este material não tem texto para resumir.");
    const summary = await aiText(
      SYSTEM,
      `Faz um resumo de estudo estruturado em Markdown (títulos, tópicos, termos-chave a negrito, e uma secção final "Pontos a decorar") do material "${m.title}":\n\n${m.content.slice(0, 120000)}`,
    );
    await db().from("materials").update({ summary }).eq("id", m.id);
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
  .inputValidator((d: { id: string; count: number }) =>
    z.object({ id: z.string().uuid(), count: z.number().int().min(3).max(15) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { aiObject } = await import("./ai.server");
    const m = await getMaterial(db(), data.id);
    if (!m.content.trim()) throw new Error("Este material não tem texto para gerar perguntas.");
    return await aiObject(
      SYSTEM,
      `Cria ${data.count} perguntas de escolha múltipla (4 opções cada) sobre o material "${m.title}". Varia a dificuldade. Indica o índice (0-3) da resposta correta e uma explicação curta.\n\n${m.content.slice(0, 120000)}`,
      quizSchema,
    );
  });

export const askTutor = createServerFn({ method: "POST" })
  .inputValidator((d: { question: string; materialId?: string; history?: { q: string; a: string }[] }) =>
    z.object({
      question: z.string().trim().min(1).max(4000),
      materialId: z.string().uuid().optional(),
      history: z.array(z.object({ q: z.string().max(4000), a: z.string().max(8000) })).max(6).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { aiText } = await import("./ai.server");
    let ctx = "";
    if (data.materialId) {
      const m = await getMaterial(db(), data.materialId);
      if (!m.content?.trim()) throw new Error("Este material ainda não tem texto extraído. Importa o PDF com texto para o Tutor o poder consultar.");
      ctx = `Material de referência "${m.title}" (excerto disponível):\n${m.content.slice(0, 100000)}\n\nResponde com base apenas neste material. Se a resposta não estiver no excerto, indica-o claramente. Não inventes referências nem páginas.\n\n`;
    }
    const previous = (data.history ?? []).map(h => `Aluno: ${h.q}\nTutor: ${h.a}`).join("\n\n");
    const prompt = `${ctx}${previous ? `Contexto da conversa anterior:\n${previous}\n\n` : ""}Pergunta atual do aluno: ${data.question}\n\nResponde em português de Portugal, com explicações claras, exemplos veterinários úteis e sem inventar factos. Se for uma situação clínica urgente, recomenda avaliação por médico veterinário.`;
    const answer = await aiText(SYSTEM, prompt);
    if (!answer?.trim()) throw new Error("A IA não devolveu uma resposta. Tenta novamente.");
    return { answer };
  });
