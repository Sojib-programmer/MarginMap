import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { screenListing, type ListingScreen } from "@/lib/listing-risk.functions";
import { useMembership } from "@/lib/membership";

export type RiskScreenDetails = {
  title?: string;
  marketplace?: string;
  itemPrice?: number;
  shippingPrice?: number;
  conditionGrade?: string;
  medianSold?: number;
  sampleSize?: number;
};

const VERDICT_COPY: Record<ListingScreen["verdict"], { label: string; tone: string }> = {
  worth_evaluating: { label: "Worth evaluating", tone: "text-success border-success/40" },
  needs_more_evidence: { label: "Needs more evidence", tone: "text-warning border-warning/40" },
  skip: { label: "Not worth the time", tone: "text-destructive border-destructive/40" },
};

const SEVERITY_TONE: Record<string, string> = {
  high: "text-destructive",
  medium: "text-warning",
  low: "text-muted-foreground",
};

/**
 * Sourcing-risk screen. Sends the listing address and/or the details on screen
 * to the analyst model and reports whether the item merits full deal maths.
 */
export function ListingRiskPanel({
  listingUrl,
  details,
}: {
  listingUrl?: string | undefined;
  details: RiskScreenDetails;
}) {
  const { membership } = useMembership();
  const screen = useServerFn(screenListing);

  const run = useMutation({
    mutationFn: async (): Promise<ListingScreen> => {
      if (!membership?.workspaceId) throw new Error("No workspace selected.");
      const clean = Object.fromEntries(
        Object.entries(details).filter(([, v]) => v !== undefined && v !== null && v !== ""),
      );
      return screen({
        data: {
          workspaceId: membership.workspaceId,
          ...(listingUrl ? { listingUrl } : {}),
          details: clean,
        },
      });
    },
    onError: (e: Error) => toast.error(e.message.replace(/^[A-Z_]+:\s*/, "")),
  });

  const data = run.data;
  const verdict = data ? VERDICT_COPY[data.verdict] : null;
  const hasEvidence = Boolean(listingUrl || details.title || (details.itemPrice ?? 0) > 0);

  return (
    <section className="panel space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Sourcing risk screen</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Checks the listing for counterfeit, condition, seller and shipping risk, then says
            whether it is worth running the full numbers. Judgement only — never a buy instruction.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-9"
          disabled={!hasEvidence || run.isPending}
          onClick={() => run.mutate()}
        >
          {run.isPending ? "Screening…" : data ? "Screen again" : "Screen this listing"}
        </Button>
      </div>

      {!hasEvidence ? (
        <p className="text-xs text-muted-foreground">
          Paste a listing address or enter a title and price above, then run the screen.
        </p>
      ) : null}

      {data ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-medium ${verdict?.tone ?? ""}`}
            >
              {verdict?.label}
            </span>
            <span className="text-sm font-medium">{data.headline}</span>
          </div>
          <p className="text-sm text-muted-foreground">{data.summary}</p>

          {data.risks.length ? (
            <ul className="space-y-1.5">
              {data.risks.map((r, i) => (
                <li key={`${r.label}-${i}`} className="text-xs">
                  <span
                    className={`font-medium uppercase tracking-wide ${SEVERITY_TONE[r.severity] ?? ""}`}
                  >
                    {r.severity}
                  </span>{" "}
                  <span className="font-medium">{r.label}</span> —{" "}
                  <span className="text-muted-foreground">{r.detail}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {data.checks.length ? (
            <div>
              <p className="label-meta">Check before you commit</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                {data.checks.map((c, i) => (
                  <li key={`check-${i}`}>{c}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {data.missing_evidence.length ? (
            <div>
              <p className="label-meta">Missing evidence</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                {data.missing_evidence.map((m, i) => (
                  <li key={`missing-${i}`}>{m}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="text-[11px] text-muted-foreground">
            {data.sourceNote} AI-generated assessment from the evidence shown — verify before you
            buy.
          </p>
        </div>
      ) : null}
    </section>
  );
}
