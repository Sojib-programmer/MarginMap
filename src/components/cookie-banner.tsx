import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  NOTICE_TEXT,
  OPEN_SETTINGS_EVENT,
  STORAGE_KEY,
  isConsentRequiredRegion,
  saveConsent,
  storedChoice,
  updateConsent,
} from "@/lib/consent";

export function CookieBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (storedChoice() === null) {
      void isConsentRequiredRegion().then((required) => {
        if (!cancelled && required && storedChoice() === null) setOpen(true);
      });
    }
    const onOpen = () => setOpen(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      if (e.newValue === "granted" || e.newValue === "denied") {
        updateConsent(e.newValue);
        setOpen(false);
      }
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, onOpen);
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener(OPEN_SETTINGS_EVENT, onOpen);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  if (!open) return null;

  const choose = (d: "granted" | "denied") => {
    saveConsent(d);
    setOpen(false);
  };
  const current = storedChoice();

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-title"
      className="panel fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl p-5 shadow-lg"
    >
      <h2 id="cookie-title" className="text-sm font-semibold">
        Cookie settings
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {NOTICE_TEXT}{" "}
        <a href="/privacy" className="text-primary underline">
          Privacy
        </a>
        {" · "}
        <a
          href="https://business.safety.google/privacy/"
          target="_blank"
          rel="noreferrer"
          className="text-primary underline"
        >
          How Google uses data
        </a>
      </p>
      {current && (
        <p className="mt-2 label-meta">
          Current choice: {current === "granted" ? "accepted" : "rejected"}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => choose("granted")}>
          Accept
        </Button>
        <Button size="sm" variant="outline" onClick={() => choose("denied")}>
          Reject
        </Button>
        {current && (
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Close
          </Button>
        )}
      </div>
    </div>
  );
}
