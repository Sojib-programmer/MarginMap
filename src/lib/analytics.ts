/**
 * Thin attribution layer. Loads gtag.js only when a measurement ID is
 * configured (Google Analytics connector). Everything is a safe no-op
 * otherwise, so ad-conversion calls can be placed in the funnel today.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

const MEASUREMENT_ID = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY"] as
  string | undefined;

let initialized = false;

function push(args: unknown[]) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(args);
}

export function analyticsConfigured() {
  return Boolean(MEASUREMENT_ID);
}

export function initAnalytics() {
  if (initialized || typeof window === "undefined" || !MEASUREMENT_ID) return;
  initialized = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);

  push(["js", new Date()]);
  push(["config", MEASUREMENT_ID]);
}

export function trackPageView(path: string) {
  if (!MEASUREMENT_ID) return;
  push(["event", "page_view", { page_path: path }]);
}

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (!MEASUREMENT_ID) return;
  push(["event", name, params]);
}

/** Primary ad conversion: a new account was created. */
export function trackSignUp(method: "email" | "google" | "apple") {
  trackEvent("sign_up", { method });
}

/** Secondary conversion: an existing account returned. */
export function trackLogin(method: "email" | "google" | "apple") {
  trackEvent("login", { method });
}
