import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { PRICE_IDS, type BillingInterval, type PaidPlan } from "@/lib/billing";
import { createStripeClient, getStripeErrorMessage, type StripeEnv } from "@/lib/stripe.server";

/**
 * The server, not the browser, decides which Stripe environment is active.
 * Once live keys exist this deployment is live: sandbox checkouts are refused,
 * so test cards can never buy a real entitlement.
 */
export function serverPaymentEnv(): StripeEnv {
  return process.env["STRIPE_LIVE_API_KEY"] ? "live" : "sandbox";
}

const RETURN_HOSTS = [
  /^marginmap\.assistant\.bd$/,
  /\.lovable\.app$/,
  /^localhost$/,
  /^127\.0\.0\.1$/,
];

/** Rejects return URLs pointing anywhere but this app (open-redirect guard). */
export function assertSafeReturnUrl(raw: string): string {
  const url = new URL(raw);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("Return URL must use https.");
  }
  if (!RETURN_HOSTS.some((re) => re.test(url.hostname))) {
    throw new Error("Return URL must point to this app.");
  }
  return url.toString().replace(/%7BCHECKOUT_SESSION_ID%7D/g, "{CHECKOUT_SESSION_ID}");
}

function checkEnv(requested: StripeEnv): string | null {
  const actual = serverPaymentEnv();
  return requested === actual
    ? null
    : `Payments on this deployment run in ${actual} mode; the ${requested} checkout was refused.`;
}

export async function requireWorkspaceOwner(
  supabase: SupabaseClient<Database>,
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
      if (customer.metadata?.["userId"] !== options.userId) {
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

export async function createWorkspaceCheckout(options: {
  supabase: SupabaseClient<Database>;
  workspaceId: string;
  userId: string;
  tier: PaidPlan;
  interval: BillingInterval;
  environment: StripeEnv;
  returnUrl: string;
}) {
  try {
    const envError = checkEnv(options.environment);
    if (envError) return { error: envError };
    const returnUrl = assertSafeReturnUrl(options.returnUrl);
    const workspace = await requireWorkspaceOwner(
      options.supabase,
      options.workspaceId,
      options.userId,
    );
    const { data: existing } = await options.supabase
      .from("subscriptions")
      .select("status,current_period_end")
      .eq("workspace_id", options.workspaceId)
      .eq("environment", options.environment)
      .in("status", ["active", "trialing", "past_due"])
      .limit(1)
      .maybeSingle();
    if (existing) return { error: "This workspace already has an active subscription." };

    const stripe = createStripeClient(options.environment);
    const priceId = PRICE_IDS[options.tier][options.interval];
    const prices = await stripe.prices.list({ lookup_keys: [priceId], limit: 1 });
    const price = prices.data[0];
    if (!price) return { error: "The selected plan price is unavailable." };

    const {
      data: { user },
    } = await options.supabase.auth.getUser();
    const customerId = await resolveOrCreateCustomer(stripe, {
      ...(user?.email ? { email: user.email } : {}),
      userId: options.userId,
    });
    const metadata = {
      userId: options.userId,
      workspaceId: workspace.id,
      priceId,
      managed_payments: "false",
    };
    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: price.id, quantity: 1 }],
      mode: "subscription",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      customer: customerId,
      automatic_tax: { enabled: true },
      metadata,
      subscription_data: { metadata },
    });
    return { clientSecret: session.client_secret ?? "" };
  } catch (error) {
    return {
      error:
        error instanceof Error && !("type" in error) ? error.message : getStripeErrorMessage(error),
    };
  }
}

export async function createWorkspacePortal(options: {
  supabase: SupabaseClient<Database>;
  workspaceId: string;
  userId: string;
  environment: StripeEnv;
  returnUrl: string;
}) {
  try {
    const envError = checkEnv(options.environment);
    if (envError) return { error: envError };
    const returnUrl = assertSafeReturnUrl(options.returnUrl);
    await requireWorkspaceOwner(options.supabase, options.workspaceId, options.userId);
    const { data: subscription, error } = await options.supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("workspace_id", options.workspaceId)
      .eq("environment", options.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !subscription?.stripe_customer_id) {
      return { error: "No subscription exists for this workspace." };
    }
    const stripe = createStripeClient(options.environment);
    const portal = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: returnUrl,
    });
    return { url: portal.url };
  } catch (error) {
    return {
      error:
        error instanceof Error && !("type" in error) ? error.message : getStripeErrorMessage(error),
    };
  }
}
