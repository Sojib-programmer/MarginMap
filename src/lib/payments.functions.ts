import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { PRICE_IDS, type BillingInterval, type PaidPlan } from "@/lib/billing";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createStripeClient,
  getStripeErrorMessage,
  type StripeEnv,
} from "@/lib/stripe.server";

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

async function requireWorkspaceOwner(
  supabase: Parameters<typeof requireWorkspaceOwner>[0],
  workspaceId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("workspaces")
    .select("id,owner_id,name")
    .eq("id", workspaceId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (error || !data) throw new Error("Only the workspace owner can manage billing.");
  return data;
}

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId: string },
) {
  if (!/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid user ID");
  const found = await stripe.customers.search({
    query: `metadata['userId']:'${options.userId}'`,
    limit: 1,
  });
  if (found.data[0]) return found.data[0].id;
  if (options.email) {
    const byEmail = await stripe.customers.list({ email: options.email, limit: 1 });
    const customer = byEmail.data[0];
    if (customer) {
      if (customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email ? { email: options.email } : {}),
    metadata: { userId: options.userId },
  });
  return created.id;
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => checkoutSchema.parse(input))
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    try {
      const workspace = await requireWorkspaceOwner(
        context.supabase,
        data.workspaceId,
        context.userId,
      );
      const { data: existing } = await context.supabase
        .from("subscriptions")
        .select("status,current_period_end")
        .eq("workspace_id", data.workspaceId)
        .eq("environment", data.environment)
        .in("status", ["active", "trialing", "past_due"])
        .limit(1)
        .maybeSingle();
      if (existing) return { error: "This workspace already has an active subscription." };

      const stripe = createStripeClient(data.environment as StripeEnv);
      const priceId = PRICE_IDS[data.tier as PaidPlan][data.interval as BillingInterval];
      const prices = await stripe.prices.list({ lookup_keys: [priceId], limit: 1 });
      const price = prices.data[0];
      if (!price) return { error: "The selected plan price is unavailable." };

      const {
        data: { user },
      } = await context.supabase.auth.getUser();
      const customerId = await resolveOrCreateCustomer(stripe, {
        email: user?.email,
        userId: context.userId,
      });
      const metadata = {
        userId: context.userId,
        workspaceId: workspace.id,
        priceId,
        managed_payments: "false",
      };
      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "subscription",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        automatic_tax: { enabled: true },
        metadata,
        subscription_data: { metadata },
      });
      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
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
    try {
      await requireWorkspaceOwner(context.supabase, data.workspaceId, context.userId);
      const { data: subscription, error } = await context.supabase
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("workspace_id", data.workspaceId)
        .eq("environment", data.environment)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !subscription?.stripe_customer_id) {
        return { error: "No subscription exists for this workspace." };
      }
      const stripe = createStripeClient(data.environment as StripeEnv);
      const portal = await stripe.billingPortal.sessions.create({
        customer: subscription.stripe_customer_id,
        return_url: data.returnUrl,
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });