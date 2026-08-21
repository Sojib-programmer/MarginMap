import { cn } from "@/lib/utils";

export type FilterOption = { key: string; label: string };

/** Multi-select toggle chips used for marketplace and category filters. */
export function FilterGroup({
  label,
  options,
  selected,
  onToggle,
  onClear,
  className,
}: {
  label: string;
  options: FilterOption[];
  selected: string[];
  onToggle: (key: string) => void;
  onClear: () => void;
  className?: string;
}) {
  if (options.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <span className="label-meta mr-1">{label}</span>
      {options.map((o) => {
        const active = selected.includes(o.key);
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(o.key)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-border bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
      {selected.length > 0 ? (
        <button
          type="button"
          onClick={onClear}
          className="px-1 text-xs text-muted-foreground underline hover:text-foreground"
        >
          clear
        </button>
      ) : null}
    </div>
  );
}
