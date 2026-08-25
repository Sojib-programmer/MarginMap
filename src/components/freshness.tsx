import { AlertTriangle } from "lucide-react";

import { Chip } from "@/components/primitives";
import {
  freshnessLabel,
  freshnessOf,
  FRESHNESS_TONE,
  intervalLabel,
  stalenessCaveat,
} from "@/lib/freshness";
import { cn } from "@/lib/utils";

/** Per-record freshness chip. Never aggregated across sources. */
export function FreshnessChip({
  iso,
  className,
}: {
  iso: string | null | undefined;
  className?: string;
}) {
  const level = freshnessOf(iso);
  return (
    <Chip tone={FRESHNESS_TONE[level]} className={cn("whitespace-nowrap", className)}>
      {freshnessLabel(iso)}
    </Chip>
  );
}

/** Source name + its own retrieval timestamp + age. One line, per row. */
export function SourceStamp({
  source,
  iso,
  isLive,
  refreshMinutes,
  className,
}: {
  source: string;
  iso: string | null | undefined;
  isLive?: boolean;
  refreshMinutes?: number | null;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <p className="truncate text-xs font-medium">
        {source}{" "}
        <span className="text-muted-foreground">
          · {isLive ? "live" : "sample"}
          {refreshMinutes !== undefined ? ` · ${intervalLabel(refreshMinutes)}` : ""}
        </span>
      </p>
      <p className="num text-[11px] text-muted-foreground">
        {iso ? new Date(iso).toLocaleString() : "no retrieval timestamp"}
      </p>
      <FreshnessChip iso={iso} />
    </div>
  );
}

/** Inline warning shown wherever a decision is being made on old evidence. */
export function StalenessWarning({
  iso,
  className,
}: {
  iso: string | null | undefined;
  className?: string;
}) {
  const caveat = stalenessCaveat(iso);
  if (!caveat) return null;
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-md border border-caution/40 bg-caution/10 p-2.5 text-xs leading-snug text-caution",
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
      {caveat}
    </p>
  );
}
