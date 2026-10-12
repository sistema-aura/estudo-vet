/**
 * Safe, provider-specific errors. Never return raw API messages, tokens,
 * response bodies, stack traces, or prompt content to the browser.
 */
export function friendlyAiError(error: unknown): string {
  const candidate = error && typeof error === "object" ? error as {
    statusCode?: unknown;
    status?: unknown;
    message?: unknown;
    cause?: unknown;
    data?: unknown;
    responseBody?: unknown;
    name?: unknown;
  } : null;
  const cause = candidate?.cause && typeof candidate.cause === "object"
    ? candidate.cause as { statusCode?: unknown; status?: unknown; message?: unknown }
    : null;
  const status = Number(candidate?.statusCode ?? candidate?.status ??
    cause?.statusCode ?? cause?.status ?? 0);
  const raw = typeof candidate?.message === "string" ? candidate.message : "";
  const kind = typeof candidate?.name === "string" ? candidate.name : "";
  const body = typeof candidate?.responseBody === "string" ? candidate.responseBody.slice(0, 1200) : "";
  // Inspect provider error codes for classification ONLY. Never expose them.
  let code = "";
  const data = candidate?.data;
  if (data && typeof data === "object") {
    const record = data as { error?: { code?: unknown }; code?: unknown };
    const found = record.error?.code ?? record.code;
    if (typeof found === "string") code = found;
  }
  const text = (raw + " " + code + " " + body).toLowerCase();

  // The AI SDK may wrap the original provider error in a cause or return a
  // response body with a provider code but no HTTP status on the outer error.
  // Extract only recognized, non-sensitive categories.
  if (/insufficient_quota|billing_hard_limit_reached|billing_not_active|quota_exceeded/.test(text)) {
    return "A conta da API OpenAI não tem saldo ou faturação ativa. Confirma os créditos e limites em platform.openai.com.";
  }
  if (/invalid_api_key|incorrect.api.key|invalid.authentication|authentication.error/.test(text)) {
    return "A chave da API OpenAI não foi aceite. Confirma a Secret Key no Lovable Cloud.";
  }
  if (/model_not_found|does.not.exist|unsupported.model/.test(text)) {
    return "O modelo de IA não está disponível na conta OpenAI. Verifica OPENAI_MODEL.";
  }
  if (/rate.limit|too.many.requests|requests.per.min/.test(text)) {
    return "A API OpenAI atingiu temporariamente o limite de pedidos. Aguarda um momento e tenta novamente.";
  }
  if (/unsupported.parameter|unsupported.value|invalid.request|invalid.function.call/.test(text)) {
    return "A API OpenAI rejeitou um parâmetro do pedido. É necessário ajustar a integração do modelo.";
  }
  if (/not.found|404/.test(text) && /model|endpoint|responses/.test(text)) {
    return "O endpoint ou modelo OpenAI configurado não está disponível.";
  }

  if (raw.includes("OPENAI_API_KEY_NOT_CONFIGURED")) {
    return "Falta configurar a chave OPENAI_API_KEY como segredo no servidor do VetEstudo. Nunca a coloques numa variável VITE_ nem no navegador.";
  }
  if (status === 429 && /insufficient_quota|billing|quota.exceeded|hard_limit|out.of.credit/.test(text)) {
    return "A conta da API OpenAI não tem saldo ou atingiu o limite de despesa. Verifica a faturação e os limites em platform.openai.com.";
  }
  if (status === 402 || /insufficient_quota|billing_hard_limit_reached/.test(text)) {
    return "A conta da API OpenAI não tem saldo disponível ou atingiu o limite de despesa. Confirma a faturação em platform.openai.com.";
  }
  if (status === 429) {
    return "A API OpenAI atingiu temporariamente o limite de pedidos. Aguarda um momento e tenta novamente.";
  }
  if (status === 401 || /invalid_api_key|incorrect.api.key/.test(text)) {
    return "A chave OPENAI_API_KEY é inválida ou foi revogada. Substitui-a no gestor de segredos do alojamento.";
  }
  if (status === 403) {
    return "A chave da API OpenAI não tem permissão para este modelo ou projeto. Confirma as permissões em platform.openai.com.";
  }
  if (status === 404 || /model_not_found/.test(text)) {
    return "O modelo configurado em OPENAI_MODEL não está disponível para esta conta da API OpenAI.";
  }
  if (status === 400 || status === 422) {
    return "A API OpenAI rejeitou o formato do pedido. Verifica o modelo e a configuração da integração.";
  }
  if (status >= 500 && status < 600) {
    return "A API OpenAI está temporariamente indisponível. Tenta novamente dentro de alguns minutos.";
  }
  if (/abort|timed? ?out|timeout|deadline/i.test(raw)) {
    return "A resposta da IA demorou demasiado tempo. Tenta novamente com um PDF mais curto.";
  }
  if (/NoObjectGenerated|invalid.+(json|schema)|could not parse|JSONParse|schema validation/i.test(raw + " " + kind)) {
    return "A IA não devolveu dados no formato esperado. Tenta gerar novamente.";
  }
  if (raw === "EMPTY_AI_RESPONSE") {
    return "A IA devolveu uma resposta vazia. Tenta novamente ou seleciona outro modelo.";
  }
  if (/fetch failed|network|connection refused|failed to fetch/i.test(raw)) {
    return "Não foi possível ligar à API OpenAI. Verifica a ligação do servidor e tenta novamente.";
  }
  return "Não foi possível concluir o pedido à API OpenAI. Verifica a chave, o saldo e o modelo configurados no servidor.";
}
