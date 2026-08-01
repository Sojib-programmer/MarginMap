import { createFileRoute } from "@tanstack/react-router";

import { PillarPage } from "@/components/marketing";
import { PILLAR_BY_SLUG } from "@/content/pillars";
import { pillarHead } from "@/lib/seo";

const SLUG = "evidence-and-data-confidence";

export const Route = createFileRoute("/_marketing/evidence-and-data-confidence")({
  head: () => pillarHead(SLUG),
  component: () => <PillarPage pillar={PILLAR_BY_SLUG[SLUG]!} />,
});
