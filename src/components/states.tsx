import { useRouter } from "@tanstack/react-router";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function InlineSpinner({ label = "Loading" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </span>
  );
}

export function PanelSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("panel space-y-3 p-4", className)} aria-busy="true">
      <Skeleton className="h-4 w-32" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-full" />
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <PanelSkeleton key={i} rows={4} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="panel divide-y divide-border" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="ml-auto h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function RouteLoading({ title = "Loading" }: { title?: string }) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-56" />
      <p className="sr-only">{title}</p>
      <CardGridSkeleton />
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel grid place-items-center p-10 text-center">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function RouteError({ error, reset }: { error: Error; reset?: () => void }) {
  const router = useRouter();
  return (
    <div className="panel p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 text-caution" aria-hidden />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">This section didn't load</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The data request failed. Your workspace data is safe — retrying usually resolves it.
          </p>
          <p className="mt-2 break-words font-mono text-xs text-muted-foreground">
            {error?.message ?? "Unknown error"}
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                router.invalidate();
                reset?.();
              }}
            >
              Try again
            </Button>
            <Button size="sm" variant="outline" onClick={() => router.navigate({ to: "/app" })}>
              Back to overview
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RouteNotFound({ label = "record" }: { label?: string }) {
  const router = useRouter();
  return (
    <EmptyState
      title={`That ${label} doesn't exist`}
      body="It may have been removed, or the link is wrong. Try searching the catalog instead."
      action={
        <Button size="sm" onClick={() => router.navigate({ to: "/app/search", search: { q: "" } })}>
          Go to search
        </Button>
      }
    />
  );
}

/** Wraps a query result in consistent loading / error / empty presentation. */
export function QueryBoundary({
  isLoading,
  error,
  isEmpty,
  empty,
  skeleton,
  children,
}: {
  isLoading: boolean;
  error?: unknown;
  isEmpty?: boolean;
  empty?: React.ReactNode;
  skeleton?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (isLoading) return <>{skeleton ?? <CardGridSkeleton count={3} />}</>;
  if (error)
    return <RouteError error={error instanceof Error ? error : new Error(String(error))} />;
  if (isEmpty && empty) return <>{empty}</>;
  return <>{children}</>;
}
