/** Converts AI gateway failures into actionable messages without exposing credentials or request bodies. */
export function friendlyAiError(error: unknown): string {
  const candidate = error && typeof error === "object" ? error as {
    statusCode?: unknown; status?: unknown; message?: unknown; cause?: unknown;
  } : null;
  const cause = candidate?.cause && typeof candidate.cause === "object"
    ? candidate.cause as { statusCode?: unknown; status?: unknown } : null;
  const code = Number(candidate?.statusCode ?? candidate?.status ?? cause?.statusCode ?? cause?.status ?? 0);
  const message = typeof candidate?.message === "string" ? candidate.message : "";
  if (message.includes("Configuração de IA em falta")) {
    return "A ligação à IA ainda não está configurada no Lovable Cloud. Confirma a variável LOVABLE_API_KEY nas configurações do projeto.";
  }
  if (code === 402) return "Os créditos de IA do projeto estão esgotados. Verifica a faturação e os limites do Lovable Cloud.";
  if (code === 429) return "A IA está temporariamente limitada por demasiados pedidos. Aguarda um pouco e tenta novamente.";
  if (code === 401 || code === 403) return "A chave de acesso à IA não foi aceite. Confirma a configuração LOVABLE_API_KEY no Lovable Cloud.";
  if (code === 404) return "O modelo de IA configurado não está disponível neste projeto. Verifica o modelo escolhido no Lovable Cloud.";
  if (code === 400 || code === 422) return "A IA recusou o formato do pedido. O projeto pode precisar de atualizar o modelo ou a integração.";
  if (code >= 500 && code < 600) return "O serviço de IA está temporariamente indisponível. Tenta novamente dentro de alguns minutos.";
  if (/abort|timed? ?out|timeout|deadline/i.test(message)) {
    return "O serviço de IA demorou demasiado tempo a responder. Tenta novamente com um PDF mais pequeno.";
  }
  if (/NoObjectGenerated|invalid.+(json|schema)|could not parse|JSONParse|schema validation/i.test(message)) {
    return "A IA não devolveu perguntas num formato válido. Tenta gerar novamente.";
  }
  if (/fetch failed|network|connection refused|failed to fetch/i.test(message)) {
    return "Não foi possível ligar ao serviço de IA. Verifica a ligação e tenta novamente.";
  }
  return "Não foi possível concluir o pedido à IA. Tenta novamente; se persistir, verifica a configuração e os créditos do Lovable Cloud.";
}
