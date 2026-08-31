import { BrandLogo } from "@/components/brand-logo";
import { InvitationBanner } from "@/components/invitation-banner";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Boxes,
  Calculator,
  CreditCard,
  Database,
  GitCompareArrows,
  History,
  LayoutGrid,
  LogOut,
  Search,
  Settings,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Input } from "@/components/ui/input";
import { useAlertHits } from "@/hooks/use-alert-hits";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { useCompare } from "@/lib/compare-store";
import { hasResellerPlan, PLAN_LABEL, ROLE_LABEL, useMembership } from "@/lib/membership";
import { cn } from "@/lib/utils";
import { useRoleMode } from "@/lib/role-mode";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutGrid;
  exact?: boolean;
  reseller?: boolean;
  resellerPlan?: boolean;
};

const NAV: NavItem[] = [
  { to: "/app", label: "Overview", icon: LayoutGrid, exact: true },
  { to: "/app/search", label: "Search", icon: Search },
  { to: "/app/compare", label: "Compare", icon: GitCompareArrows },
  { to: "/app/watchlists", label: "Watchlists", icon: Star },
  { to: "/app/evaluate", label: "Evaluate", icon: Calculator, reseller: true, resellerPlan: true },
  { to: "/app/pipeline", label: "Pipeline", icon: Boxes, reseller: true, resellerPlan: true },
  { to: "/app/alerts", label: "Alerts", icon: Bell },
  { to: "/app/activity", label: "Activity", icon: History },
  { to: "/app/data-sources", label: "Data sources", icon: Database },
  { to: "/app/billing", label: "Billing", icon: CreditCard },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

export function AppShell() {
  const { mode, setMode } = useRoleMode();
  const { user } = useSession();
  const { membership, memberships, setActiveWorkspace } = useMembership();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { selected } = useCompare();
  const { hits } = useAlertHits();
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        document.getElementById("global-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="grid min-h-screen grid-cols-1 bg-background md:grid-cols-[220px_1fr]">
      <aside className="hidden border-r border-border bg-surface md:flex md:flex-col">
        <Link to="/" className="flex items-center gap-2 px-4 py-4">
          <BrandLogo size={26} priority />
        </Link>

        {memberships.length > 1 ? (
          <div className="px-3 pb-3">
            <Select
              value={membership?.workspaceId ?? ""}
              onValueChange={(v) => setActiveWorkspace(v)}
            >
              <SelectTrigger className="h-8 text-xs" aria-label="Active workspace">
                <SelectValue placeholder="Workspace" />
              </SelectTrigger>
              <SelectContent>
                {memberships.map((m) => (
                  <SelectItem key={m.workspaceId} value={m.workspaceId}>
                    {m.workspaceName} · {ROLE_LABEL[m.role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="px-3 pb-3">
          <div
            role="radiogroup"
            aria-label="Role mode"
            className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-background p-1"
          >
            {(["buyer", "reseller"] as const).map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-md px-2 py-1.5 text-xs font-medium capitalize transition-colors",
                  mode === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
            {mode === "buyer"
              ? "Optimizing for landed cost, fit and trust."
              : "Optimizing for net proceeds, ROI and liquidity."}
          </p>
        </div>

        <nav className="flex-1 space-y-0.5 px-2">
          {NAV.filter(
            (n) =>
              (!n.reseller || mode === "reseller") &&
              (!n.resellerPlan || hasResellerPlan(membership)),
          ).map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to as never}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
                {item.to === "/app/compare" && selected.length > 0 ? (
                  <span className="num ml-auto rounded-full bg-primary/20 px-1.5 text-[11px] text-primary">
                    {selected.length}
                  </span>
                ) : null}
                {item.to === "/app/alerts" && hits.length > 0 ? (
                  <span className="num ml-auto rounded-full bg-verified/20 px-1.5 text-[11px] text-verified">
                    {hits.length}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <Link
            to="/app/billing"
            className="mb-3 block rounded-md border border-border bg-background p-2.5 transition-colors hover:border-primary/50"
          >
            <p className="text-xs font-medium">
              {membership ? `${PLAN_LABEL[membership.plan]} plan` : "Plan"}
              {membership ? (
                <span className="text-muted-foreground"> · {ROLE_LABEL[membership.role]}</span>
              ) : null}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              {membership && !hasResellerPlan(membership)
                ? "Unlock the deal calculator, pipeline and unlimited alerts — see Billing."
                : "Plan, seat and workspace details."}
            </p>
          </Link>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 h-8 w-full justify-start px-2 text-xs"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
          >
            <LogOut className="size-3.5" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur">
          <form
            className="flex w-full max-w-2xl items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim().length > 1) navigate({ to: "/app/search", search: { q: q.trim() } });
            }}
          >
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="global-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Describe what you want — “mirrorless full-frame body under $2000, excellent”"
                className="pl-9"
                aria-label="Search products"
              />
            </div>
            <Button type="submit" size="sm">
              Search
            </Button>
          </form>
          <Link
            to="/app/alerts"
            className="relative ml-auto hidden rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground lg:block"
            aria-label={hits.length ? `${hits.length} price alerts triggered` : "Price alerts"}
          >
            <Bell className="size-4" />
            {hits.length > 0 ? (
              <span className="num absolute -right-0.5 -top-0.5 rounded-full bg-verified px-1 text-[10px] font-semibold text-background">
                {hits.length}
              </span>
            ) : null}
          </Link>
        </header>

        <InvitationBanner />

        <main className="min-w-0 flex-1 px-4 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
