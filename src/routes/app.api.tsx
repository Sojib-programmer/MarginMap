import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { RouteError } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { canManageMembers, hasTier, useMembership } from "@/lib/membership";

export const Route = createFileRoute("/app/api")({
  head: () => ({ meta: [{ title: "API console — MarginMap" }, { name: "robots", content: "noindex" }] }),
  errorComponent: ({ error, reset }) => <RouteError error={error} reset={reset} />,
  component: ApiConsole,
});

type Key = {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};
type Req = { endpoint: string; status: number; latency_ms: number | null; created_at: string };

function ApiConsole() {
  const { membership } = useMembership();
  const ws = membership?.workspaceId ?? null;
  const eligible = hasTier(membership, "business");
  const manager = canManageMembers(membership);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);

  const keys = useQuery({
    queryKey: ["api-keys", ws],
    enabled: !!ws,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("id,name,key_prefix,last_used_at,revoked_at,created_at")
        .eq("workspace_id", ws!)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data as Key[];
    },
  });

  const requests = useQuery({
    queryKey: ["api-requests", ws],
    enabled: !!ws,
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 864e5).toISOString();
      const { data, error } = await supabase
        .from("api_requests")
        .select("endpoint,status,latency_ms,created_at")
        .eq("workspace_id", ws!)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw new Error(error.message);
      return data as Req[];
    },
  });

  const usage = useQuery({
    queryKey: ["api-usage", ws],
    enabled: !!ws,
    queryFn: async () => {
      const d = new Date();
      const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
      const { data } = await supabase
        .from("usage_counters")
        .select("used")
        .eq("workspace_id", ws!)
        .eq("metric", "api_calls")
        .eq("period_start", month)
        .maybeSingle();
      return data?.used ?? 0;
    },
  });

  const stats = useMemo(() => {
    const rows = requests.data ?? [];
    const lat = rows
      .map((r) => r.latency_ms)
      .filter((n): n is number => n != null)
      .sort((a, b) => a - b);
    const p = (q: number) => (lat.length ? lat[Math.min(lat.length - 1, Math.floor(q * lat.length))] : null);
    const errors = rows.filter((r) => r.status >= 400).length;
    const limited = rows.filter((r) => r.status === 429).length;
    return { total: rows.length, errors, limited, p50: p(0.5), p95: p(0.95) };
  }, [requests.data]);

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("create_api_key", {
        _workspace_id: ws!,
        _name: name.trim() || "Default key",
      });
      if (error) throw new Error(error.message.replace(/^[A-Z_]+: /, ""));
      return (data as { token: string }).token;
    },
    onSuccess: (token) => {
      setFresh(token);
      setName("");
      qc.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("revoke_api_key", { _key_id: id });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Key revoked");
      qc.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const plan = membership?.plan ?? "free";
  const monthly = plan === "enterprise" ? "Unlimited" : plan === "business" ? "1,000" : "—";
  const burst = plan === "enterprise" ? 600 : plan === "business" ? 60 : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <p className="label-meta">Developers</p>
        <h1 className="text-2xl font-semibold tracking-tight">API console</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Keys, limits and traffic for this workspace's REST API.{" "}
          <Link to="/developers" className="underline">
            Reference
          </Link>
        </p>
      </header>

      {!eligible ? (
        <section className="panel p-4">
          <h2 className="text-sm font-semibold">API access needs Business or Enterprise</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Business includes 1,000 calls/month at 60 requests/minute. Enterprise is unlimited at
            600 requests/minute.
          </p>
          <Button asChild size="sm" className="mt-3">
            <Link to="/app/billing">See plans</Link>
          </Button>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-4">
        <Stat label="Calls this month" value={`${usage.data ?? 0} / ${monthly}`} />
        <Stat label="Burst limit" value={burst ? `${burst}/min` : "—"} />
        <Stat label="Errors (7d)" value={`${stats.errors} of ${stats.total}`} />
        <Stat
          label="Latency p50 / p95"
          value={stats.p50 == null ? "—" : `${stats.p50} / ${stats.p95} ms`}
        />
      </section>

      <section className="panel p-4">
        <h2 className="text-sm font-semibold">API keys</h2>
        {fresh ? (
          <div className="mt-3 rounded-md border border-primary/40 bg-primary/10 p-3">
            <p className="text-xs font-medium">Copy this key now — it will not be shown again.</p>
            <div className="mt-2 flex gap-2">
              <code className="flex-1 truncate font-mono text-xs">{fresh}</code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void navigator.clipboard?.writeText(fresh);
                  toast.success("Copied");
                }}
              >
                Copy
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setFresh(null)}>
                Done
              </Button>
            </div>
          </div>
        ) : null}
        {eligible && manager ? (
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <Input
              className="h-9"
              placeholder="Key name, e.g. Inventory sync"
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
            />
            <Button size="sm" type="submit" disabled={create.isPending}>
              Create key
            </Button>
          </form>
        ) : eligible ? (
          <p className="mt-2 text-xs text-muted-foreground">Only owners and admins can create keys.</p>
        ) : null}
        <ul className="mt-3 divide-y divide-border">
          {(keys.data ?? []).map((k) => (
            <li key={k.id} className="flex items-center gap-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {k.name}{" "}
                  {k.revoked_at ? <span className="text-xs text-destructive">revoked</span> : null}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {k.key_prefix}… · last used{" "}
                  {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "never"}
                </p>
              </div>
              {manager && !k.revoked_at ? (
                <Button size="sm" variant="outline" onClick={() => revoke.mutate(k.id)}>
                  Revoke
                </Button>
              ) : null}
            </li>
          ))}
          {keys.data?.length === 0 ? (
            <li className="py-2 text-sm text-muted-foreground">No keys yet.</li>
          ) : null}
        </ul>
      </section>

      <section className="panel p-4">
        <h2 className="text-sm font-semibold">Recent requests</h2>
        <p className="text-xs text-muted-foreground">
          Last 7 days · {stats.limited} rate-limited
        </p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-1">Time</th>
                <th>Endpoint</th>
                <th>Status</th>
                <th className="text-right">Latency</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {(requests.data ?? []).slice(0, 50).map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="py-1">{new Date(r.created_at).toLocaleString()}</td>
                  <td>{r.endpoint}</td>
                  <td className={r.status >= 400 ? "text-destructive" : ""}>{r.status}</td>
                  <td className="text-right">{r.latency_ms ?? "—"} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
          {requests.data?.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">No traffic yet.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-3">
      <p className="label-meta">{label}</p>
      <p className="mt-1 font-mono text-sm">{value}</p>
    </div>
  );
}
