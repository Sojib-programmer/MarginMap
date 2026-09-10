import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/$")({
  // Returning HTTP 200 for a missing page is a soft 404: crawlers index the
  // error page and monitoring never sees the failure. Throwing notFound()
  // makes Start emit a real 404 status with this page as the body.
  loader: () => {
    throw notFound();
  },
  head: () => ({
    meta: [
      { title: "Page not found — MarginMap" },
      {
        name: "description",
        content: "That MarginMap page doesn't exist. Head back to the homepage or your workspace.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CatchAll,
  errorComponent: CatchAll,
  notFoundComponent: CatchAll,
});

function CatchAll() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <div className="panel max-w-md p-8 text-center">
        <p className="label-meta">404</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">We couldn't find that page</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The link may be out of date or mistyped. Nothing in your workspace was affected.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button asChild size="sm">
            <Link to="/">Back to homepage</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/app">Open workspace</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to="/app/search" search={{ q: "" }}>
              Search the catalog
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
