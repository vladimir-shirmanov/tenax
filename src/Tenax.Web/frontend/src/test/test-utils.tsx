import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactElement } from "react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { render } from "@testing-library/react";

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

export const renderRoute = (
  routePath: string,
  element: ReactElement,
  initialEntry: string
) => {
  const queryClient = createTestQueryClient();
  const router = createMemoryRouter(
    [
      { path: routePath, element },
      { path: "*", element: <div>navigated</div> },
    ],
    { initialEntries: [initialEntry] }
  );

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    ),
  };
};
