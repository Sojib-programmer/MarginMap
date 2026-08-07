import { Link } from "@tanstack/react-router";

import { Disclaimer } from "@/components/primitives";
import { PILLARS } from "@/content/pillars";

const COLUMNS: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: "Platform",
    links: PILLARS.slice(0, 4).map((p) => ({ to: `/${p.slug}`, label: p.nav })),
  },
  {
    title: "For resellers",
    links: PILLARS.slice(4).map((p) => ({ to: `/${p.slug}`, label: p.nav })),
  },
  {
    title: "Company",
    links: [
      { to: "/about", label: "About" },
      { to: "/pricing", label: "Pricing" },
      { to: "/methodology", label: "Methodology" },
      { to: "/faq", label: "FAQ" },
      { to: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { to: "/privacy", label: "Privacy" },
      { to: "/terms", label: "Terms" },
      { to: "/auth", label: "Sign in" },
      { to: "/app", label: "Workspace" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <span className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                MM
              </span>
              <span className="font-semibold tracking-tight">MarginMap</span>
            </span>
            <p className="mt-3 text-sm text-muted-foreground">
              Product intelligence for people who move money on the answer.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="label-meta">{col.title}</h2>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to as never}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <Disclaimer />
          <p className="mt-3 text-xs text-muted-foreground">
            Marketsync Global Ltd. · Reg. No RAJC-2483/2025 · TIN 317774303960 · Trade Licence
            01/13-2665 · Kashidanga City Gate, Rajpara, Rajshahi-6201, Bangladesh · Incorporated
            under the Companies Act, 1994 (Act XVIII of 1994).
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            © {new Date().getFullYear()} MarginMap. All rights reserved.
          </p>
        </div>

      </div>
    </footer>
  );
}
