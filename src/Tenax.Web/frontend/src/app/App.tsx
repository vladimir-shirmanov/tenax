import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { createQueryClient } from "./queryClient";
import { router } from "./router";
import { ThemeProvider } from "./theme";

const queryClient = createQueryClient();

export const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </QueryClientProvider>
);
