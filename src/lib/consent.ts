/**
 * Advertising consent + Google Ads loader.
 *
 * Route: regional banner, basic blocking. In consent regions (EEA, UK, CH,
 * Canada as a stand-in for Quebec) the Google Ads tag and conversion events
 * never load until the visitor accepts. Elsewhere tracking runs without a
 * banner. Consent Mode defaults are set in __root.tsx head before anything.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export const GOOGLE_ADS_ID = "AW-18470665560";
export const SIGNUP_SEND_TO = "AW-18470665560/7GrKCL_q-oIdENj6v-dE";

export const OAUTH_INTENT_KEY = "marginmap.oauth_intent";
export const STORAGE_KEY = "cookie_consent";
export const RECORD_KEY = "cookie_consent_record";
export const NOTICE_VERSION = "2026-09-24";
export const NOTICE_TEXT =
  "MarginMap uses Google Ads cookies to measure whether our ads lead to account sign-ups. Accepting lets Google set advertising cookies and receive sign-up events from this browser. Rejecting keeps them off. You can change this any time via Cookie settings.";
export const OPEN_SETTINGS_EVENT = "marginmap:open-cookie-settings";

const CONSENT_COUNTRIES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT",
  "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO",
  "GB", "CH", "CA",
];

let consentRegion: Promise<boolean> | undefined;

export function isConsentRequiredRegion(): Promise<boolean> {
  return (consentRegion ??= lookupConsentRegion());
}

async function lookupConsentRegion(): Promise<boolean> {
  try {
    const res = await fetch("/cdn-cgi/trace", { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return true;
    const country = (await res.text()).match(/^loc=([A-Z0-9]{2})$/m)?.[1];
    if (!country || country === "XX" || country === "T1") return true;
    return CONSENT_COUNTRIES.includes(country);
  } catch {
    return true;
  }
}

export function storedChoice(): "granted" | "denied" | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "granted" || v === "denied" ? v : null;
}

export async function hasAdConsent(): Promise<boolean> {
  return storedChoice() === "granted";
}

export async function canTrackAds(): Promise<boolean> {
  const choice = storedChoice();
  if (choice !== null) return choice === "granted";
  const required = await isConsentRequiredRegion();
  const latest = storedChoice();
  return latest !== null ? latest === "granted" : !required;
}

export function updateConsent(decision: "granted" | "denied") {
  if (decision === "denied") window.gtag?.("set", "user_data", null);
  window.gtag?.("consent", "update", {
    ad_storage: decision,
    ad_user_data: decision,
    ad_personalization: decision,
  });
}

type ConsentRecord = {
  choice: "granted" | "denied";
  at: string;
  noticeVersion: string;
  noticeText: string;
  purposes: string[];
  recipients: string[];
  history: { choice: "granted" | "denied"; at: string; noticeVersion: string }[];
};

/** Persist the choice plus the evidence of what was shown and when. */
export function saveConsent(decision: "granted" | "denied") {
  const at = new Date().toISOString();
  let history: ConsentRecord["history"] = [];
  try {
    const prev = JSON.parse(localStorage.getItem(RECORD_KEY) ?? "null") as ConsentRecord | null;
    history = prev?.history ?? [];
  } catch {
    /* corrupt record: start fresh */
  }
  const record: ConsentRecord = {
    choice: decision,
    at,
    noticeVersion: NOTICE_VERSION,
    noticeText: NOTICE_TEXT,
    purposes: ["Ad conversion measurement", "Ad optimisation"],
    recipients: ["Google Ads"],
    history: [...history, { choice: decision, at, noticeVersion: NOTICE_VERSION }],
  };
  localStorage.setItem(RECORD_KEY, JSON.stringify(record));
  localStorage.setItem(STORAGE_KEY, decision);
  updateConsent(decision);
  if (decision === "granted") void loadGoogleAds();
}

/** Loads the Google Ads tag only when advertising tracking is allowed. */
export async function loadGoogleAds() {
  if (typeof window === "undefined") return;
  const allowed = await canTrackAds();
  if (!allowed) return;
  const dl = (window.dataLayer = window.dataLayer ?? []);
  window.gtag =
    window.gtag ||
    function gtag() {
      // eslint-disable-next-line prefer-rest-params
      dl.push(arguments);
    };
  updateConsent("granted");
  if (document.querySelector("script[data-google-ads]")) return;
  window.gtag("js", new Date());
  window.gtag("config", GOOGLE_ADS_ID);
  const script = document.createElement("script");
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
  script.async = true;
  script.dataset["googleAds"] = "";
  document.head.appendChild(script);
}

/** Report one sign-up conversion; blocked events are dropped, never queued. */
export async function reportSignupConversion() {
  await loadGoogleAds();
  if (!(await canTrackAds())) return;
  window.gtag?.("event", "conversion", { send_to: SIGNUP_SEND_TO, value: 1.0, currency: "BDT" });
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
}
