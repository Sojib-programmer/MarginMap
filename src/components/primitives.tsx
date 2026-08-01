import { cn } from "@/lib/utils";
import { CONDITION_LABEL } from "@/lib/scoring";
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

export function ConfidenceMeter({ value, label = "Confidence" }: { value: number; label?: string }) {
  const pctValue = Math.round(value * 100);
  const tone = pctValue >= 65 ? "bg-verified" : pctValue >= 40 ? "bg-caution" : "bg-destructive";
  return (
    <div className="flex items-center gap-2">
      <span className="label-meta">{label}</span>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${label} ${pctValue} percent`}>
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
      fees, or resale outcome. Demo data comes from synthetic registered sources.
    </p>
  );
}
