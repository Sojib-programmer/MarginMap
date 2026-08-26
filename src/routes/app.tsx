import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { AppShell } from "@/components/app-shell";
import { useSession } from "@/hooks/use-session";
import { CompareProvider } from "@/lib/compare-store";
import { MembershipProvider } from "@/lib/membership";
import { RoleModeProvider } from "@/lib/role-mode";

export const Route = createFileRoute("/app")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Workspace — MarginMap" },
      {
        name: "description",
        content:
          "Your MarginMap workspace: search, compare landed cost, evaluate resale margin and track deals.",
      },
      { property: "og:title", content: "Workspace — MarginMap" },
      { property: "og:description", content: "Evidence-backed buying and reselling decisions." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AppLayout,
});

function AppLayout() {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <p className="text-sm text-muted-foreground">Loading workspace…</p>
      </div>
    );
  }

  return (
    <MembershipProvider>
      <RoleModeProvider>
        <CompareProvider>
          <AppShell />
        </CompareProvider>
      </RoleModeProvider>
    </MembershipProvider>
  );
}
