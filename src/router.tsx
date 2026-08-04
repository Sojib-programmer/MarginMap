import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";

import { RouteError, RouteNotFound } from "@/components/states";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: ({ error, reset }) => (
      <div className="mx-auto max-w-3xl p-6">
        <RouteError error={error} reset={reset} />
      </div>
    ),
    defaultNotFoundComponent: () => (
      <div className="mx-auto max-w-3xl p-6">
        <RouteNotFound label="page" />
      </div>
    ),
  });

  return router;
};
