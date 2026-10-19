import { normalizeCurrency } from "./fx";

type Rate = { usdPerUnit: number; asOf: string; source: string };
const cache = new Map<string, { at: number; rate: Rate }>();
const TTL_MS = 6 * 60 * 60 * 1000;

/**
 * USD per 1 unit of `currency`, from ECB reference rates (frankfurter.dev).
 * Returns null when no rate is available — callers must not guess.
 */
export async function usdRate(currency: string): Promise<Rate | null> {
  const code = normalizeCurrency(currency);
  if (code === "USD") return { usdPerUnit: 1, asOf: new Date().toISOString().slice(0, 10), source: "identity" };
  const hit = cache.get(code);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.rate;
  try {
    const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=${code}&symbols=USD`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { date?: string; rates?: { USD?: number } };
    const r = body.rates?.USD;
    if (!r || !Number.isFinite(r) || r <= 0) return null;
    const rate = { usdPerUnit: r, asOf: body.date ?? "", source: "ECB reference rate" };
    cache.set(code, { at: Date.now(), rate });
    return rate;
  } catch {
    return null;
  }
}
