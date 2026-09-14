import { loadStripe, type Stripe } from "@stripe/stripe-js";

export type StripeEnv = "sandbox" | "live";

const clientToken = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"];

export function paymentsConfigured() {
  return clientToken?.startsWith("pk_test_") || clientToken?.startsWith("pk_live_");
}

export function getStripeEnvironment(): StripeEnv {
  if (clientToken?.startsWith("pk_test_")) return "sandbox";
  if (clientToken?.startsWith("pk_live_")) return "live";
  throw new Error(
    "Payments are not configured for this build. Complete payment go-live before accepting customers.",
  );
}

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe() {
  if (!stripePromise) {
    getStripeEnvironment();
    stripePromise = loadStripe(clientToken as string);
  }
  return stripePromise;
}