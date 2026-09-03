import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PLAN_LABEL, type PlanTier } from "@/lib/entitlements";
import { canManageBilling, useMembership } from "@/lib/membership";

/**
 * Starts a paid upgrade. Checkout is provisioned through Stripe; until the
 * checkout session endpoint is live for a workspace, we route the request to
 * the team rather than pretending a charge succeeded.
 */
export function UpgradeButton({
  tier,
  interval,
  label,
  className,
}: {
  tier: PlanTier;
  interval: "monthly" | "annual";
  label?: string;
  className?: string;
}) {
  const { membership } = useMembership();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const allowed = canManageBilling(membership);

  return (
    <Button
      size="sm"
      className={className}
      disabled={busy}
      onClick={() => {
        if (!allowed) {
          toast.error("Only the workspace owner can change the plan.");
          return;
        }
        setBusy(true);
        toast.info(
          `Starting ${PLAN_LABEL[tier]} (${interval}) checkout — we'll confirm your workspace details first.`,
        );
        void navigate({ to: "/contact" }).finally(() => setBusy(false));
      }}
    >
      {label ?? `Upgrade to ${PLAN_LABEL[tier]}`}
    </Button>
  );
}
