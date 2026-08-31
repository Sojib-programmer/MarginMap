import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ContactInput = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  topic: z.enum(["product", "data", "billing", "team", "security"]),
  message: z.string().trim().min(20).max(5000),
});

/** Stores a public contact-form submission in the staff inbox. */
export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ContactInput.parse(data))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"]!;
    const key =
      process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"]!;
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === "Bearer " + key) {
            headers.delete("Authorization");
          }
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });

    const { error } = await supabase.from("contact_messages").insert({
      name: data.name,
      email: data.email,
      topic: data.topic,
      message: data.message,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
