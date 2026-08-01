import { createFileRoute } from "@tanstack/react-router";

import { PillarPage } from "@/components/marketing";
import { PILLAR_BY_SLUG } from "@/content/pillars";
import { pillarHead } from "@/lib/seo";

const SLUG = "sourcing-workflow";

export const Route = createFileRoute("/_marketing/sourcing-workflow")({
  head: () => pillarHead(SLUG),
  component: () => <PillarPage pillar={PILLAR_BY_SLUG[SLUG]!} />,
});
