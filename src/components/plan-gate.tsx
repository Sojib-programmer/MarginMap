import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PLAN_LABEL, type PlanTier } from "@/lib/entitlements";
import { hasTier, useMembership } from "@/lib/membership";

/**
 * Renders an upgrade wall for tier-gated features. The database enforces the
 * same boundary — this is the honest UI counterpart, not the security control.
 */
export function PlanGate({
  feature,
  tier = "pro",
  children,
}: {
  feature: string;
  tier?: PlanTier;
  children: React.ReactNode;
}) {
  const { membership, loading } = useMembership();
  if (loading) return null;
  if (!membership || hasTier(membership, tier)) return <>{children}</>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="panel p-6 text-center">
        <Lock className="mx-auto size-5 text-muted-foreground" aria-hidden />
        <p className="label-meta mt-2">{PLAN_LABEL[tier]} plan required</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{feature} is locked</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your workspace is on the {PLAN_LABEL[membership.plan]} plan. {feature} needs{" "}
          {PLAN_LABEL[tier]} or higher. Writes are blocked server-side, so nothing here would save.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button asChild size="sm">
            <Link to="/app/billing">View plans</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/app">Back to overview</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Small inline upsell for a locked control that sits inside a working page. */
export function InlineUpsell({
  message,
  tier = "pro",
  className,
}: {
  message: string;
  tier?: PlanTier;
  className?: string;
}) {
  return (
    <div
      className={
        className ??
        "flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
      }
    >
      <Lock className="size-3.5 shrink-0" aria-hidden />
      <span>{message}</span>
      <Link to="/app/billing" className="font-medium text-primary underline underline-offset-2">
        Upgrade to {PLAN_LABEL[tier]}
      </Link>
    </div>
  );
}
