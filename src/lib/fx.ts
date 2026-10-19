/** Pure FX helpers shared by the server converter and tests. */
export function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Converts `amount` in a foreign currency to USD given units-of-USD per 1 foreign unit. */
export function convertToUsd(amount: number | null, usdPerUnit: number): number | null {
  if (amount == null || !Number.isFinite(amount)) return amount;
  if (!Number.isFinite(usdPerUnit) || usdPerUnit <= 0) throw new Error("Invalid FX rate");
  return roundCents(amount * usdPerUnit);
}

export function normalizeCurrency(code: string | null | undefined): string {
  const c = (code ?? "USD").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(c) ? c : "USD";
}
