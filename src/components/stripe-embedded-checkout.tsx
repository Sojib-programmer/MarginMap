import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { useCallback } from "react";

import type { BillingInterval, PaidPlan } from "@/lib/billing";
import { createCheckoutSession } from "@/lib/payments.functions";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";

export function StripeEmbeddedCheckout({
  workspaceId,
  tier,
  interval,
}: {
  workspaceId: string;
  tier: PaidPlan;
  interval: BillingInterval;
}) {
  const createCheckout = useServerFn(createCheckoutSession);
  const fetchClientSecret = useCallback(async () => {
    const result = await createCheckout({
      data: {
        workspaceId,
        tier,
        interval,
        environment: getStripeEnvironment(),
        returnUrl: `${window.location.origin}/app/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("Payment form could not be initialized.");
    return result.clientSecret;
  }, [createCheckout, interval, tier, workspaceId]);

  return (
    <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  );
}
