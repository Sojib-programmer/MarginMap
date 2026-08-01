import { cn } from "@/lib/utils";
import { scoreBand, type Factor } from "@/lib/scoring";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const TONE_TEXT = {
  verified: "text-verified",
  primary: "text-primary",
  caution: "text-caution",
  destructive: "text-destructive",
} as const;

const TONE_STROKE = {
  verified: "stroke-verified",
  primary: "stroke-primary",
  caution: "stroke-caution",
  destructive: "stroke-destructive",
} as const;

export function ScoreGauge({
  score,
  factors,
  caption,
  size = 64,
}: {
  score: number;
  factors: Factor[];
  caption: string;
  size?: number;
}) {
  const band = scoreBand(score);
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;

  return (
    <Popover>
      <PopoverTrigger
        className="group flex items-center gap-3 rounded-md p-1 text-left transition-colors hover:bg-accent"
        aria-label={`${caption}: ${score} of 100. Open factor breakdown.`}
      >
        <span className="relative inline-flex" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              className="fill-none stroke-muted"
              strokeWidth={6}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              className={cn("fill-none", TONE_STROKE[band.tone])}
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * c} ${c}`}
            />
          </svg>
          <span
            className={cn(
              "num absolute inset-0 flex items-center justify-center text-sm font-semibold",
              TONE_TEXT[band.tone],
            )}
          >
            {score}
          </span>
        </span>
        <span className="leading-tight">
          <span className="label-meta block">{caption}</span>
          <span className={cn("text-sm font-medium", TONE_TEXT[band.tone])}>{band.label}</span>
          <span className="block text-xs text-muted-foreground underline decoration-dotted">
            factors
          </span>
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 bg-popover">
        <p className="label-meta mb-2">Score components</p>
        <ul className="space-y-2">
          {factors.map((f) => (
            <li key={f.key}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm">{f.label}</span>
                <span className="num text-xs text-muted-foreground">
                  {Math.round(f.weight * 100)}% weight · {Math.round(f.value * 100)}/100
                </span>
              </div>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${f.value * 100}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{f.detail}</p>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
