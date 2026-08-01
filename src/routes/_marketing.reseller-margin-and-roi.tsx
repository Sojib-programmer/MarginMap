import { createFileRoute } from "@tanstack/react-router";

import { PillarPage } from "@/components/marketing";
import { PILLAR_BY_SLUG } from "@/content/pillars";
import { pillarHead } from "@/lib/seo";

const SLUG = "reseller-margin-and-roi";

export const Route = createFileRoute("/_marketing/reseller-margin-and-roi")({
  head: () => pillarHead(SLUG),
  component: () => <PillarPage pillar={PILLAR_BY_SLUG[SLUG]!} />,
});
