import mark from "@/assets/marginmap-mark.png";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  size?: number;
  withWordmark?: boolean;
  priority?: boolean;
};

export function BrandLogo({ className, size = 28, withWordmark = true, priority = false }: Props) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <img
        src={mark}
        alt="MarginMap logo"
        width={size}
        height={size}
        loading={priority ? "eager" : "lazy"}
        style={{ width: size, height: size }}
        className="shrink-0 object-contain"
      />
      {withWordmark ? (
        <span className="font-semibold tracking-tight">
          Margin<span className="text-primary">Map</span>
        </span>
      ) : null}
    </span>
  );
}
