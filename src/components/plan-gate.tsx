import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { hasResellerPlan, PLAN_LABEL, useMembership } from "@/lib/membership";

/**
 * Renders an upgrade wall for reseller-plan features. The database enforces the
 * same boundary — this is the honest UI counterpart, not the security control.
 */
export function ResellerPlanGate({
  feature,
  children,
}: {
  feature: string;
  children: React.ReactNode;
}) {
  const { membership, loading } = useMembership();
  if (loading) return null;
  if (!membership || hasResellerPlan(membership)) return <>{children}</>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="panel p-6 text-center">
        <p className="label-meta">Reseller plan required</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{feature} is locked</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your workspace is on the {PLAN_LABEL[membership.plan]} plan. {feature} needs the Reseller
          plan or higher. Writes are blocked server-side, so nothing here would save.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button asChild size="sm">
            <Link to="/app/billing">View plans</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/app/search">Back to search</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
