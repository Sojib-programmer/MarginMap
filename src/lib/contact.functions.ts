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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("contact_messages").insert({
      name: data.name,
      email: data.email,
      topic: data.topic,
      message: data.message,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
