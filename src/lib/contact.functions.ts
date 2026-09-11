import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createHash } from "crypto";
import { z } from "zod";

const ContactInput = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  topic: z.enum(["product", "data", "billing", "team", "security"]),
  message: z.string().trim().min(20).max(5000),
  /** Honeypot: must stay empty. Bots fill every field they find. */
  company: z.string().max(200).optional(),
  /** Milliseconds the form was on screen before submission. */
  elapsedMs: z.number().int().nonnegative().optional(),
});

const MIN_FILL_MS = 2500;

/** Stores a public contact-form submission in the staff inbox. */
export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ContactInput.parse(data))
  .handler(async ({ data }) => {
    // Silently accept obvious bot traffic: no feedback, no database write.
    if (data.company && data.company.trim().length > 0) return { ok: true as const };
    if (data.elapsedMs !== undefined && data.elapsedMs < MIN_FILL_MS) {
      throw new Error("That was submitted unusually fast. Please try again.");
    }

    // The rate limiter is a privileged internal helper: signed-out callers must
    // not be able to reach it directly, so this runs with the server-side
    // client after the honeypot and timing checks above have passed.
    const { supabaseAdmin: supabase } = await import("@/integrations/supabase/client.server");

    // Rate limit by caller IP and by email address. The IP is hashed so the
    // limiter never stores a raw network identifier.
    const forwarded = getRequestHeader("x-forwarded-for") ?? "";
    const ip = forwarded.split(",")[0]?.trim() || "unknown";
    const ipKey = "contact:ip:" + createHash("sha256").update(ip).digest("hex").slice(0, 32);
    const emailKey = "contact:email:" + data.email.toLowerCase();

    for (const [k, limit, windowSeconds] of [
      [ipKey, 5, 3600],
      [emailKey, 3, 86400],
    ] as const) {
      const { data: allowed, error } = await supabase.rpc("hit_rate_limit", {
        _key: k,
        _limit: limit,
        _window_seconds: windowSeconds,
      });
      if (error) throw new Error(error.message);
      if (allowed === false) {
        throw new Error("Too many messages sent recently. Please try again later.");
      }
    }

    const { error } = await supabase.from("contact_messages").insert({
      name: data.name,
      email: data.email,
      topic: data.topic,
      message: data.message,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
