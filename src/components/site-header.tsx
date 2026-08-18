import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { PILLARS } from "@/content/pillars";
import { cn } from "@/lib/utils";

const PLATFORM = PILLARS.slice(0, 8);

const SIMPLE_LINKS = [
  { to: "/methodology", label: "Methodology" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [platformOpen, setPlatformOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <BrandLogo priority />
        </Link>


        <nav className="ml-4 hidden items-center gap-1 md:flex">
          <div
            className="relative"
            onMouseEnter={() => setPlatformOpen(true)}
            onMouseLeave={() => setPlatformOpen(false)}
          >
            <button
              type="button"
              aria-expanded={platformOpen}
              aria-haspopup="true"
              onClick={() => setPlatformOpen((v) => !v)}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Platform
            </button>
            {platformOpen ? (
              <div className="absolute left-0 top-full w-[30rem] pt-2">
                <div className="panel grid grid-cols-2 gap-1 p-2 shadow-xl">
                  {PLATFORM.map((p) => (
                    <Link
                      key={p.slug}
                      to={`/${p.slug}` as never}
                      onClick={() => setPlatformOpen(false)}
                      className="rounded-md px-3 py-2 hover:bg-accent"
                    >
                      <span className="block text-sm font-medium">{p.nav}</span>
                      <span className="label-meta">{p.kicker}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {SIMPLE_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to as never}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/app">Open workspace</Link>
          </Button>
          <button
            type="button"
            className="rounded-md p-2 text-muted-foreground md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <div className={cn("border-t border-border md:hidden", open ? "block" : "hidden")}>
        <nav className="mx-auto grid max-w-6xl gap-0.5 px-4 py-3">
          <p className="label-meta pb-1">Platform</p>
          {PLATFORM.map((p) => (
            <Link
              key={p.slug}
              to={`/${p.slug}` as never}
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {p.nav}
            </Link>
          ))}
          <p className="label-meta pb-1 pt-3">Company</p>
          {SIMPLE_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to as never}
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
