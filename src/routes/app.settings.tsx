import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Disclaimer } from "@/components/primitives";
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
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery } from "@/lib/catalog";
import { useRoleMode } from "@/lib/role-mode";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

type Profile = {
  id: string;
  display_name: string | null;
  country_code: string;
  currency_code: string;
  default_role: "buyer" | "reseller";
};

function SettingsPage() {
  const { user } = useSession();
  const { mode, setMode } = useRoleMode();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const catalog = useQuery(catalogQuery);

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,display_name,country_code,currency_code,default_role")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as Profile | null;
    },
  });

  const [form, setForm] = useState<Partial<Profile>>({});
  useEffect(() => {
    if (profile.data) setForm(profile.data);
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: form.display_name ?? null,
          country_code: form.country_code ?? "US",
          currency_code: form.currency_code ?? "USD",
          default_role: (form.default_role ?? mode) as never,
        })
        .eq("id", user.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <p className="label-meta">Settings</p>
        <h1 className="text-2xl font-semibold tracking-tight">Preferences & data sources</h1>
      </header>

      <section className="panel grid gap-3 p-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label className="label-meta">Display name</Label>
          <Input
            className="mt-1 h-9"
            value={form.display_name ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
          />
        </div>
        <div>
          <Label className="label-meta">Country</Label>
          <Input
            className="mt-1 h-9"
            value={form.country_code ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, country_code: e.target.value.toUpperCase() }))}
          />
        </div>
        <div>
          <Label className="label-meta">Currency</Label>
          <Input
            className="mt-1 h-9"
            value={form.currency_code ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, currency_code: e.target.value.toUpperCase() }))}
          />
        </div>
        <div>
          <Label className="label-meta">Default mode</Label>
          <Select
            value={form.default_role ?? mode}
            onValueChange={(v) => {
              setForm((f) => ({ ...f, default_role: v as "buyer" | "reseller" }));
              setMode(v as "buyer" | "reseller");
            }}
          >
            <SelectTrigger className="mt-1 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="buyer">Buyer</SelectItem>
              <SelectItem value="reseller">Reseller</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
            Save settings
          </Button>
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="text-sm font-semibold">Registered data sources</h2>
        <ul className="mt-2 divide-y divide-border">
          {(catalog.data?.sources ?? []).map((s) => (
            <li key={s.id} className="py-2 text-sm">
              <p className="font-medium">{s.name}</p>
              <p className="text-xs text-muted-foreground">
                {s.source_type.replace(/_/g, " ")} · {s.refresh_policy ?? "no refresh policy"}
              </p>
              {s.attribution_text ? (
                <p className="text-xs text-muted-foreground">{s.attribution_text}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel p-4">
        <h2 className="text-sm font-semibold">Account</h2>
        <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
        <Button
          size="sm"
          variant="outline"
          className="mt-2"
          onClick={async () => {
            await qc.cancelQueries();
            qc.clear();
            await supabase.auth.signOut();
            navigate({ to: "/auth", replace: true });
          }}
        >
          Sign out
        </Button>
      </section>

      <Disclaimer />
    </div>
  );
}
