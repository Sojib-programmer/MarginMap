import { useState } from "react";
import { toast } from "sonner";

import { StripeEmbeddedCheckout } from "@/components/stripe-embedded-checkout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BillingInterval, PaidPlan } from "@/lib/billing";
import { PLAN_LABEL } from "@/lib/entitlements";
import { canManageBilling, useMembership } from "@/lib/membership";
import { paymentsConfigured } from "@/lib/stripe";

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
  tier: PaidPlan;
  interval: BillingInterval;
  label?: string;
  className?: string;
}) {
  const { membership } = useMembership();
  const [open, setOpen] = useState(false);

  const allowed = canManageBilling(membership);

  return (
    <>
      <Button
        size="sm"
        className={className}
        onClick={() => {
          if (!allowed || !membership) {
            toast.error("Only the workspace owner can change the plan.");
            return;
          }
          if (!paymentsConfigured()) {
            toast.error("Payments are not configured for this build.");
            return;
          }
          setOpen(true);
        }}
      >
        {label ?? `Upgrade to ${PLAN_LABEL[tier]}`}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto p-0">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle>
              {PLAN_LABEL[tier]} · {interval}
            </DialogTitle>
            <DialogDescription>
              Secure embedded checkout. Tax is calculated and collected at checkout.
            </DialogDescription>
          </DialogHeader>
          {membership ? (
            <StripeEmbeddedCheckout
              workspaceId={membership.workspaceId}
              tier={tier}
              interval={interval}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
