import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { submitContactMessage } from "@/lib/contact.functions";


import { PageHero } from "@/components/marketing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_marketing/contact")({
  head: () =>
    pageHead({
      path: "/contact",
      title: "Contact MarginMap",
      description:
        "Questions about data sources, reseller plans, team seats or a category you want covered — send them here.",
    }),
  component: ContactPage,
});

type Errors = Partial<Record<"name" | "email" | "message", string>>;

const TOPICS = [
  { value: "product", label: "Product question" },
  { value: "data", label: "Data source or coverage" },
  { value: "billing", label: "Plans and billing" },
  { value: "team", label: "Team seats" },
  { value: "security", label: "Security or privacy" },
];

function ContactPage() {
  const send = useServerFn(submitContactMessage);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("product");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (name.trim().length < 2) next.name = "Tell us who you are.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      next.email = "Enter a valid email address.";
    if (message.trim().length < 20)
      next.message = "Give us at least a couple of sentences of context.";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      toast.error("Check the highlighted fields.");
      return;
    }

    setSending(true);
    try {
      await send({
        data: {
          name: name.trim(),
          email: email.trim(),
          topic: topic as "product" | "data" | "billing" | "team" | "security",
          message: message.trim(),
        },
      });
      setSent(true);
      setMessage("");
      toast.success("Message received — we'll reply to " + email.trim() + ".");
    } catch (err) {
      console.error(err);
      toast.error("We couldn't send that. Try again, or email us directly.");
    } finally {
      setSending(false);
    }
  };


  return (
    <>
      <PageHero
        kicker="Contact"
        title="Talk to the people who build the numbers"
        lede="Coverage requests, data-source questions, team seats, or a disagreement with one of our figures — all of it lands in the same place."
      />

      <div className="mx-auto max-w-4xl px-4 py-14">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_16rem]">
          <form onSubmit={submit} noValidate className="panel space-y-4 p-6">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={Boolean(errors.name)}
                autoComplete="name"
              />
              {errors.name ? <p className="mt-1 text-xs text-destructive">{errors.name}</p> : null}
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(errors.email)}
                autoComplete="email"
              />
              {errors.email ? (
                <p className="mt-1 text-xs text-destructive">{errors.email}</p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="topic">Topic</Label>
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger id="topic">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOPICS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                aria-invalid={Boolean(errors.message)}
              />
              {errors.message ? (
                <p className="mt-1 text-xs text-destructive">{errors.message}</p>
              ) : null}
            </div>

            <Button type="submit" className="w-full">
              {sent ? "Send another message" : "Send message"}
            </Button>
            <p className="text-xs text-muted-foreground">
              This form validates in your browser and does not transmit anything yet — email
              delivery is not wired up.
            </p>
          </form>

          <aside className="space-y-4">
            <div className="panel p-4">
              <h2 className="label-meta">Response time</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Product and data questions are usually answered within two business days.
              </p>
            </div>
            <div className="panel p-4">
              <h2 className="label-meta">Security reports</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Choose the security topic and include reproduction steps. Please do not test against
                other users' accounts or data.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
