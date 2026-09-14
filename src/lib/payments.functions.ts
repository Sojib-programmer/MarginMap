import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type CheckoutResult = { clientSecret: string } | { error: string };
type PortalResult = { url: string } | { error: string };

const environmentSchema = z.enum(["sandbox", "live"]);
const checkoutSchema = z.object({
  workspaceId: z.string().uuid(),
  tier: z.enum(["pro", "business"]),
  interval: z.enum(["monthly", "annual"]),
  environment: environmentSchema,
  returnUrl: z.string().url(),
});

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => checkoutSchema.parse(input))
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { createWorkspaceCheckout } = await import("@/lib/payments.server");
    return createWorkspaceCheckout({
      supabase: context.supabase,
      workspaceId: data.workspaceId,
      userId: context.userId,
      tier: data.tier,
      interval: data.interval,
      environment: data.environment,
      returnUrl: data.returnUrl,
    });
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        environment: environmentSchema,
        returnUrl: z.string().url(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<PortalResult> => {
    const { createWorkspacePortal } = await import("@/lib/payments.server");
    return createWorkspacePortal({
      supabase: context.supabase,
      workspaceId: data.workspaceId,
      userId: context.userId,
      environment: data.environment,
      returnUrl: data.returnUrl,
    });
  });
