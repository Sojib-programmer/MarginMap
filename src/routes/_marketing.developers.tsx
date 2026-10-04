import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { CTABand, PageHero } from "@/components/marketing";
import { Button } from "@/components/ui/button";
import { pageHead, SITE_URL } from "@/lib/seo";

const MCP_URL = `${SITE_URL}/mcp`;

const TOOLS = [
  {
    name: "list_workspaces",
    access: "read",
    body: "Workspaces you belong to, with your role and plan. Its ids feed every other tool.",
  },
  {
    name: "list_watchlists",
    access: "read",
    body: "Watchlists in one workspace, with item counts.",
  },
  {
    name: "create_watchlist",
    access: "write",
    body: "Creates a watchlist. Refused for read-only roles and when the plan's watchlist cap is reached.",
  },
  {
    name: "list_pipeline",
    access: "read",
    body: "Sourcing pipeline items: stage, cost basis and target resale.",
  },
  {
    name: "list_deal_evaluations",
    access: "read",
    body: "Saved deal evaluations with verdict, landed cost, expected resale and ROI.",
  },
];

const CLAUDE_CONFIG = JSON.stringify(
  { mcpServers: { marginmap: { command: "npx", args: ["-y", "mcp-remote", MCP_URL] } } },
  null,
  2,
);

const CURSOR_CONFIG = JSON.stringify({ mcpServers: { marginmap: { url: MCP_URL } } }, null, 2);

export const Route = createFileRoute("/_marketing/developers")({
  head: () =>
    pageHead({
      path: "/developers",
      title: "Developers — MCP server & API — MarginMap",
      description:
        "Connect Claude, Cursor or any MCP client to MarginMap over OAuth. Tools for workspaces, watchlists, pipeline and deal evaluations, all scoped to your own permissions.",
    }),
  component: DevelopersPage,
});

function DevelopersPage() {
  return (
    <>
      <PageHero
        kicker="Developers"
        title="Build on MarginMap"
        lede="Give your AI agent the same workspace you use: watchlists, sourcing pipeline and deal evaluations, over the Model Context Protocol with OAuth sign-in. No API keys to leak, and every call runs with your own permissions."
      />

      <div className="mx-auto max-w-4xl space-y-14 px-4 py-14">
        <section>
          <h2 className="text-xl font-semibold tracking-tight">MCP server</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Streamable HTTP endpoint. Clients discover the authorization server from the
            protected-resource metadata, then send you through a MarginMap consent screen.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Endpoint label="Endpoint" value={MCP_URL} />
            <Endpoint
              label="Resource metadata"
              value={`${SITE_URL}/.well-known/oauth-protected-resource`}
            />
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight">Connect a client</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Snippet title="Claude Desktop — claude_desktop_config.json" code={CLAUDE_CONFIG} />
            <Snippet title="Cursor — .cursor/mcp.json" code={CURSOR_CONFIG} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            ChatGPT, Claude.ai and other remote-MCP clients: add a custom connector with the
            endpoint above. The first call opens the consent screen in your browser.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight">Tools</h2>
          <div className="mt-4 divide-y divide-border rounded-md border border-border">
            {TOOLS.map((t) => (
              <div key={t.name} className="flex flex-col gap-1 p-4 sm:flex-row sm:gap-4">
                <code className="w-44 shrink-0 font-mono text-sm text-primary">{t.name}</code>
                <p className="flex-1 text-sm text-muted-foreground">{t.body}</p>
                <span className="label-meta self-start">{t.access}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight">Security model</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              OAuth 2.1 with PKCE. Tokens are issued for your account only; there are no shared API
              keys.
            </li>
            <li>
              Every query runs under row-level security as you. An agent sees exactly what you see,
              in the workspaces you belong to.
            </li>
            <li>Auditor roles stay read-only; write tools are refused for them.</li>
            <li>Plan limits (watchlists, quotas) apply to agents exactly as in the app.</li>
            <li>Revoke access at any time by signing out of the connected client.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight">REST API</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Key-based REST API for Business and Enterprise workspaces. Create keys in the in-app
            API console; each key is scoped to one workspace and shown once.
          </p>
          <div className="mt-4 grid gap-2">
            <Endpoint label="Base URL" value={`${SITE}/api/public/v1`} />
            <Endpoint label="GET /v1/usage" value="Plan, burst limit, monthly quota and usage" />
            <Endpoint label="GET /v1/watchlists" value="Workspace watchlists with item counts" />
            <Endpoint
              label="GET /v1/products?q=&limit="
              value="Catalogue search (curated sample data)"
            />
          </div>
          <div className="mt-4">
            <Snippet
              title="curl"
              code={`curl ${SITE}/api/public/v1/usage \\\n  -H "Authorization: Bearer mm_live_..."`}
            />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-1">Plan</th>
                  <th>Monthly calls</th>
                  <th>Burst</th>
                  <th>Keys</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="py-1">Business</td>
                  <td>1,000</td>
                  <td>60 / min</td>
                  <td>10</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="py-1">Enterprise</td>
                  <td>Unlimited</td>
                  <td>600 / min</td>
                  <td>10</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Errors use RFC 7807 problem JSON. 401 invalid or revoked key, 403 plan lacks API
            access, 429 burst or monthly limit (with Retry-After). Responses carry RateLimit-Policy,
            X-Quota-Limit and X-Quota-Used headers. Outbound webhooks are not available yet.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to="/app/api">Open API console</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/contact">Talk to sales about Enterprise</Link>
            </Button>
          </div>
        </section>
      </div>

      <CTABand
        title="Try it with your own data"
        body="Create a free workspace, add a watchlist, then ask your agent what's on it."
      />
    </>
  );
}

function useCopy() {
  const [copied, setCopied] = useState(false);
  return {
    copied,
    copy: (text: string) => {
      void navigator.clipboard?.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    },
  };
}

function Endpoint({ label, value }: { label: string; value: string }) {
  const { copied, copy } = useCopy();
  return (
    <div className="panel flex items-center gap-2 p-3">
      <div className="min-w-0 flex-1">
        <p className="label-meta">{label}</p>
        <code className="block truncate font-mono text-xs">{value}</code>
      </div>
      <Button size="icon" variant="ghost" aria-label={`Copy ${label}`} onClick={() => copy(value)}>
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function Snippet({ title, code }: { title: string; code: string }) {
  const { copied, copy } = useCopy();
  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="label-meta truncate">{title}</p>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Copy configuration"
          onClick={() => copy(code)}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed">{code}</pre>
    </div>
  );
}
