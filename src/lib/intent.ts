import type { VariantIntel } from "./catalog";
import { landedCost } from "./scoring";

export type ParsedIntent = {
  keywords: string[];
  priceCeiling: number | null;
  priceFloor: number | null;
  conditions: string[];
  categorySlug: string | null;
  brand: string | null;
  raw: string;
};

const CONDITION_PATTERNS: Array<[RegExp, string]> = [
  [/\b(sealed|new in box|nisb|brand new|new)\b/i, "new_sealed"],
  [/\bopen box\b/i, "open_box"],
  [/\brefurb(ished)?\b/i, "refurbished"],
  [/\b(excellent|mint|like new)\b/i, "used_excellent"],
  [/\b(good|used)\b/i, "used_good"],
  [/\b(fair|rough|as-is)\b/i, "used_fair"],
  [/\b(for parts|broken|spares)\b/i, "for_parts"],
];

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "for",
  "with",
  "under",
  "below",
  "above",
  "over",
  "in",
  "on",
  "of",
  "and",
  "or",
  "to",
  "used",
  "new",
  "condition",
  "buy",
  "find",
  "me",
  "best",
  "deal",
  "deals",
  "cheap",
  "price",
  "at",
  "my",
]);

function parseMoney(text: string, patterns: RegExp[]) {
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return Number(m[1].replace(/[,$]/g, ""));
  }
  return null;
}

export function parseIntent(raw: string, catalog: VariantIntel[]): ParsedIntent {
  const text = raw.trim();
  const priceCeiling = parseMoney(text, [
    /(?:under|below|less than|max|up to|<)\s*\$?\s*([\d,]+(?:\.\d+)?)/i,
    /\$\s*([\d,]+(?:\.\d+)?)\s*(?:or less|max)/i,
  ]);
  const priceFloor = parseMoney(text, [
    /(?:over|above|at least|min|>)\s*\$?\s*([\d,]+(?:\.\d+)?)/i,
  ]);

  const conditions = CONDITION_PATTERNS.filter(([re]) => re.test(text)).map(([, c]) => c);

  const brands = Array.from(new Set(catalog.map((v) => v.brand)));
  const brand = brands.find((b) => new RegExp(`\\b${b}\\b`, "i").test(text)) ?? null;

  const categories = Array.from(new Set(catalog.map((v) => [v.category, v.categorySlug] as const)));
  const categorySlug =
    categories.find(([name]) => new RegExp(`\\b${name.replace(/s$/, "")}`, "i").test(text))?.[1] ??
    null;

  const keywords = text
    .toLowerCase()
    .replace(/[^a-z0-9\s.-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w) && !/^\d+$/.test(w));

  return { keywords, priceCeiling, priceFloor, conditions, categorySlug, brand, raw: text };
}

export type MatchedVariant = { variant: VariantIntel; relevance: number; explanation: string };

/** Transparent lexical match — no hidden ranking, reported per result. */
export function matchVariants(intent: ParsedIntent, catalog: VariantIntel[]): MatchedVariant[] {
  const results = catalog.map((variant) => {
    const haystack =
      `${variant.productName} ${variant.variantTitle} ${variant.brand} ${variant.category} ${variant.canonicalKey} ${JSON.stringify(variant.attributes)}`.toLowerCase();

    const hits = intent.keywords.filter((k) => haystack.includes(k));
    let relevance = intent.keywords.length ? hits.length / intent.keywords.length : 0.35;
    const reasons: string[] = [];
    if (hits.length) reasons.push(`matched ${hits.slice(0, 4).join(", ")}`);

    if (intent.brand && variant.brand.toLowerCase() === intent.brand.toLowerCase()) {
      relevance += 0.2;
      reasons.push(`brand ${variant.brand}`);
    }
    if (intent.categorySlug && variant.categorySlug === intent.categorySlug) {
      relevance += 0.12;
      reasons.push(`category ${variant.category}`);
    }
    if (intent.priceCeiling != null) {
      const cheapest = variant.offers.length
        ? Math.min(...variant.offers.map(landedCost))
        : Infinity;
      if (cheapest <= intent.priceCeiling) {
        relevance += 0.15;
        reasons.push(`offer within $${intent.priceCeiling} landed`);
      } else {
        relevance -= 0.25;
        reasons.push(`cheapest landed above $${intent.priceCeiling}`);
      }
    }
    if (intent.conditions.length) {
      const matching = variant.offers.filter((o) => intent.conditions.includes(o.condition_grade));
      if (matching.length) {
        relevance += 0.1;
        reasons.push(`${matching.length} offer(s) in requested condition`);
      }
    }

    return {
      variant,
      relevance: Math.max(0, Math.min(1, relevance)),
      explanation: reasons.length ? reasons.join(" · ") : "weak lexical overlap only",
    };
  });

  return results.filter((r) => r.relevance > 0.12).sort((a, b) => b.relevance - a.relevance);
}
