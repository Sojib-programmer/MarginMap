import { createFileRoute } from "@tanstack/react-router";

import { PillarPage } from "@/components/marketing";
import { PILLAR_BY_SLUG } from "@/content/pillars";
import { pillarHead } from "@/lib/seo";

const SLUG = "sold-comps-vs-asking-price";

export const Route = createFileRoute("/_marketing/sold-comps-vs-asking-price")({
  head: () => pillarHead(SLUG),
  component: () => <PillarPage pillar={PILLAR_BY_SLUG[SLUG]!} />,
});
