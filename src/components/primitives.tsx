import { cn } from "@/lib/utils";
import { CONDITION_LABEL, type Recommendation } from "@/lib/scoring";
import { freshnessTone, relativeTime } from "@/lib/format";

export function Chip({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "primary" | "verified" | "caution" | "destructive";
  className?: string;
}) {
  const tones = {
    neutral: "bg-muted text-muted-foreground border-border",
    primary: "bg-primary/15 text-primary border-primary/35",
    verified: "bg-verified/15 text-verified border-verified/35",
    caution: "bg-caution/15 text-caution border-caution/35",
    destructive: "bg-destructive/15 text-destructive border-destructive/35",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ConditionChip({ grade }: { grade: string }) {
  const tone =
    grade === "new_sealed" || grade === "open_box"
      ? "verified"
      : grade === "used_fair" || grade === "for_parts"
        ? "caution"
        : "neutral";
  return <Chip tone={tone}>{CONDITION_LABEL[grade] ?? grade}</Chip>;
}

export function FreshnessBadge({ iso }: { iso: string | null | undefined }) {
  const tone = freshnessTone(iso);
  const map = { fresh: "verified", aging: "caution", stale: "destructive" } as const;
  const label = { fresh: "Fresh", aging: "Aging", stale: "Stale" } as const;
  return (
    <Chip tone={map[tone]} className="num">
      {label[tone]} · updated {relativeTime(iso)}
    </Chip>
  );
}

export function ConfidenceMeter({
  value,
  label = "Confidence",
}: {
  value: number;
  label?: string;
}) {
  const pctValue = Math.round(value * 100);
  const tone = pctValue >= 65 ? "bg-verified" : pctValue >= 40 ? "bg-caution" : "bg-destructive";
  return (
    <div className="flex items-center gap-2">
      <span className="label-meta">{label}</span>
      <div
        className="h-1.5 w-20 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${label} ${pctValue} percent`}
      >
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${pctValue}%` }} />
      </div>
      <span className="num text-xs text-muted-foreground">{pctValue}%</span>
    </div>
  );
}

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs leading-relaxed text-muted-foreground", className)}>
      Market estimates are decision support, not a guarantee of availability, authenticity, taxes,
      fees, or resale outcome.
    </p>
  );
}

/** Neutral, one-line provenance statement about catalog coverage. */
export function CatalogNote({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs leading-relaxed text-muted-foreground", className)}>
      Catalog is a curated sample dataset. Live marketplace connectors are enabled per account.
    </p>
  );
}

/** "Data as of …" line derived from the newest record in the visible set. */
export function DataAsOf({ iso, className }: { iso: string | null | undefined; className?: string }) {
  if (!iso) return null;
  return (
    <span className={cn("num text-xs text-muted-foreground", className)}>
      Data as of {new Date(iso).toLocaleString()} · {relativeTime(iso)}
    </span>
  );
}

/** Single normalized Buy / Watch / Pass verdict. */
export function RecommendationBadge({
  rec,
  showReason = false,
  className,
}: {
  rec: Recommendation;
  showReason?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <Chip tone={rec.tone} className="uppercase tracking-wide">
        {rec.action}
      </Chip>
      {showReason ? (
        <p className="mt-1 max-w-[22rem] text-xs leading-snug text-muted-foreground">
          {rec.reason}
        </p>
      ) : (
        <span className="sr-only">{rec.reason}</span>
      )}
    </div>
  );
}

/**
 * Renders a value with its provenance state. A missing or estimated number is
 * always labeled — never rendered as a confident zero.
 */
export function ValueCell({
  value,
  state = "sourced",
  note,
  className,
}: {
  value: string;
  state?: "sourced" | "estimated" | "missing";
  note?: string;
  className?: string;
}) {
  if (state === "missing") {
    return (
      <span className={cn("text-xs text-caution", className)} title={note}>
        not provided
      </span>
    );
  }
  return (
    <span className={cn("num inline-flex items-baseline gap-1", className)} title={note}>
      {value}
      {state === "estimated" ? (
        <abbr
          title={note ?? "Estimated from completed sales, not a quoted figure"}
          className="text-[10px] uppercase tracking-wide text-caution no-underline"
        >
          est
        </abbr>
      ) : null}
    </span>
  );
}

/** Source name, retrieval timestamp and match confidence for a single record. */
export function ProvenanceCell({
  source,
  retrievedAt,
  matchConfidence,
  url,
  className,
}: {
  source: string;
  retrievedAt: string | null | undefined;
  matchConfidence?: number | null;
  url?: string | null;
  className?: string;
}) {
  return (
    <div className={cn("space-y-0.5 text-xs text-muted-foreground", className)}>
      <p className="truncate">{source}</p>
      <p className="num">retrieved {relativeTime(retrievedAt)}</p>
      {matchConfidence != null ? (
        <p className="num">match {(Number(matchConfidence) * 100).toFixed(0)}%</p>
      ) : (
        <p className="text-caution">match unknown</p>
      )}
      {url ? (
        <a className="text-primary underline" href={url} target="_blank" rel="noreferrer noopener">
          Open listing
        </a>
      ) : null}
    </div>
  );
}
