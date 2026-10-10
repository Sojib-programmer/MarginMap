import { createFileRoute } from "@tanstack/react-router";

type PaymentEnv = "sandbox" | "live";
type Json = Record<string, unknown>;

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function numberValue(value: unknown) {
  return typeof value === "number" ? value : null;
}

function isoFromUnix(value: unknown) {
  const seconds = numberValue(value);
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

async function processSubscription(
  object: Json,
  env: PaymentEnv,
  eventType: string,
  eventCreated: number | null,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { entitlementForPrice, subscriptionHasAccess } = await import("@/lib/billing");

  const metadata = (object["metadata"] ?? {}) as Json;
  const workspaceId = stringValue(metadata["workspaceId"]);
  const userId = stringValue(metadata["userId"]);
  const subscriptionId = stringValue(object["id"]);
  const customerId = stringValue(object["customer"]);
  const status =
    stringValue(object["status"]) ?? (eventType.includes("canceled") ? "canceled" : null);
  const items = ((object["items"] as Json | undefined)?.["data"] as Json[] | undefined) ?? [];
  const item = items[0];
  const price = (item?.["price"] ?? {}) as Json;
  const priceMetadata = (price["metadata"] ?? {}) as Json;
  const priceId =
    stringValue(price["lookup_key"]) ??
    stringValue(priceMetadata["lovable_external_id"]) ??
    stringValue(metadata["priceId"]);
  const entitlement = priceId ? entitlementForPrice(priceId) : null;
  if (!workspaceId || !userId || !subscriptionId || !customerId || !status || !entitlement) {
    throw new Error("Subscription event is missing trusted workspace or price metadata");
  }

  const periodStart = isoFromUnix(item?.["current_period_start"] ?? object["current_period_start"]);
  const periodEnd = isoFromUnix(item?.["current_period_end"] ?? object["current_period_end"]);
  const product = price["product"];
  const productId =
    typeof product === "string" ? product : stringValue((product as Json | null)?.["id"]);
  const cancelAtPeriodEnd = object["cancel_at_period_end"] === true;

  const eventAt = eventCreated ? new Date(eventCreated * 1000).toISOString() : null;
  // Ordering guard: Stripe does not guarantee delivery order.
  const { data: prior } = await supabaseAdmin
    .from("subscriptions")
    .select("last_event_at")
    .eq("stripe_subscription_id", subscriptionId)
    .eq("environment", env)
    .maybeSingle();
  if (prior?.last_event_at && eventAt && prior.last_event_at > eventAt) return;

  // Customer binding: once a workspace is linked to a Stripe customer, events
  // from any other customer may not change its plan, whatever metadata claims.
  const { data: ws } = await supabaseAdmin
    .from("workspaces")
    .select("stripe_customer_id")
    .eq("id", workspaceId)
    .maybeSingle();
  if (!ws) throw new Error("Workspace in subscription metadata does not exist");
  if (ws.stripe_customer_id && ws.stripe_customer_id !== customerId) {
    throw new Error("Subscription customer does not match the workspace's customer");
  }

  const { error: subscriptionError } = await supabaseAdmin.from("subscriptions").upsert(
    {
      workspace_id: workspaceId,
      user_id: userId,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      product_id: productId,
      price_id: priceId as string,
      plan: entitlement.plan,
      billing_interval: entitlement.interval,
      status,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: cancelAtPeriodEnd,
      environment: env,
      last_event_at: eventAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id,environment" },
  );
  if (subscriptionError) throw subscriptionError;

  // Sandbox events never change a real workspace's plan once live keys exist:
  // test cards must not buy production entitlements (shared database).
  if (env === "sandbox" && process.env["STRIPE_LIVE_API_KEY"]) return;

  const active = subscriptionHasAccess({ status, current_period_end: periodEnd });
  const { error: workspaceError } = await supabaseAdmin
    .from("workspaces")
    .update({
      plan: active ? entitlement.plan : "free",
      billing_interval: entitlement.interval,
      billing_cycle_start: periodStart,
      billing_cycle_end: periodEnd,
      tier_expires_at: cancelAtPeriodEnd ? periodEnd : null,
      stripe_customer_id: customerId,
      stripe_subscription_id: active ? subscriptionId : null,
    })
    .eq("id", workspaceId);
  if (workspaceError) throw workspaceError;

  await supabaseAdmin.from("activity_log").insert({
    workspace_id: workspaceId,
    actor_id: userId,
    action: active ? "billing.subscription_updated" : "billing.subscription_ended",
    target_type: "workspace",
    target_id: workspaceId,
    metadata: { plan: active ? entitlement.plan : "free", status, environment: env },
  });
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          return new Response("Invalid payment environment", { status: 400 });
        }
        let claimedEventId: string | null = null;
        try {
          const { verifyWebhook } = await import("@/lib/stripe.server");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const event = await verifyWebhook(request, rawEnv);
          const { error: claimError } = await supabaseAdmin.from("payment_events").insert({
            event_id: event.id,
            environment: rawEnv,
            event_type: event.type,
          });
          if (claimError?.code === "23505") {
            return Response.json({ received: true, duplicate: true });
          }
          if (claimError) throw claimError;
          claimedEventId = event.id;

          if (
            [
              "customer.subscription.created",
              "customer.subscription.updated",
              "customer.subscription.deleted",
              "subscription.created",
              "subscription.updated",
              "subscription.canceled",
            ].includes(event.type)
          ) {
            await processSubscription(
              event.data.object,
              rawEnv,
              event.type,
              typeof (event as { created?: unknown }).created === "number"
                ? ((event as { created?: number }).created ?? null)
                : null,
            );
          }
          return Response.json({ received: true });
        } catch (error) {
          console.error("Payment webhook failed", error);
          if (claimedEventId) {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin
              .from("payment_events")
              .delete()
              .eq("event_id", claimedEventId)
              .eq("environment", rawEnv);
          }
          return new Response("Payment webhook failed", { status: 400 });
        }
      },
    },
  },
});
