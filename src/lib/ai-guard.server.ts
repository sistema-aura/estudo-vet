import { getRequestHeader } from "@tanstack/react-start/server";

/**
 * Best-effort protection against accidental repeated requests.
 *
 * This is an in-memory guard per Worker instance, NOT a distributed spending
 * limit. Production apps should also enable an edge/WAF rate limit and
 * per-user authentication before enabling public access to paid AI endpoints.
 */
const requests = new Map<string, { minute: number; minuteCount: number; day: number; dayCount: number; seen: number }>();
const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
const PER_MINUTE = 8;
const PER_DAY = 100;
const MAX_CLIENTS = 2000;

export function guardAiRequest(): void {
  const now = Date.now();
  // cf-connecting-ip is supplied by Cloudflare. Never accept a browser-supplied
  // identifier as a reliable identity or chargeback/accounting mechanism.
  const client = (getRequestHeader("cf-connecting-ip") || "unidentified").slice(0, 100);
  const old = requests.get(client);
  const minute = Math.floor(now / MINUTE_MS);
  const day = Math.floor(now / DAY_MS);
  const minuteCount = (old?.minute === minute ? old.minuteCount : 0) + 1;
  const dayCount = (old?.day === day ? old.dayCount : 0) + 1;
  if (minuteCount > PER_MINUTE) {
    throw new Error("Limite de proteção da IA atingido. Aguarda um minuto antes de enviares novos pedidos.");
  }
  if (dayCount > PER_DAY) {
    throw new Error("Limite diário de proteção da IA atingido neste servidor. Tenta novamente amanhã.");
  }
  requests.set(client, { minute, minuteCount, day, dayCount, seen: now });
  if (requests.size > MAX_CLIENTS) {
    // Limit memory use in long-running isolates.
    for (const [id, entry] of requests) {
      if (now - entry.seen > DAY_MS) requests.delete(id);
    }
    if (requests.size > MAX_CLIENTS) requests.delete(requests.keys().next().value!);
  }
}
