import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { render } from "@testing-library/react";
import { AppShell } from "./AppShell";
import { ThemeProvider } from "../app/theme";

const mockSessionQuery = jest.fn();
const mockLoginMutation = jest.fn();
const mockLogoutMutation = jest.fn();

jest.mock("../api/auth", () => ({
  useAuthSessionQuery: () => mockSessionQuery(),
  useLoginStartMutation: () => mockLoginMutation(),
  useLogoutMutation: () => mockLogoutMutation(),
}));

const renderShell = (initialPath = "/") => {
  const routerFutureFlags = {
    v7_startTransition: true,
  } as unknown as NonNullable<Parameters<typeof createMemoryRouter>[1]>["future"];

  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <AppShell />,
        children: [
          { index: true, element: <div>Home content</div> },
          { path: "decks", element: <div>Decks content</div> },
        ],
      },
    ],
    {
      initialEntries: [initialPath],
      future: routerFutureFlags,
    }
  );

  return render(
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
};

describe("app shell", () => {
  beforeEach(() => {
    mockSessionQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      isSuccess: true,
      data: {
        isAuthenticated: true,
        user: {
          subject: "usr_1",
          displayName: "Vlada I",
          email: "vlada@example.com",
        },
        menu: {
          visible: true,
            links: [
              { key: "decks", label: "Decks", href: "/decks" },
              { key: "flashcards", label: "Flashcards", href: "/decks" },
            ],
        },
      },
      refetch: jest.fn(),
    });

    mockLoginMutation.mockReturnValue({ mutate: jest.fn(), isPending: false, isError: false });
    mockLogoutMutation.mockReturnValue({ mutate: jest.fn(), isPending: false, isError: false });
  });

  it("renders persistent header with brand, nav and all theme modes", () => {
    renderShell("/");

    expect(screen.getByRole("link", { name: /tenax/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Decks" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Flashcards" })).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /system theme/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /light theme/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dark theme/i })).toBeInTheDocument();
  });

  it("allows keyboard user to change theme preference", async () => {
    const user = userEvent.setup();
    renderShell("/");

    const darkButton = screen.getByRole("button", { name: /dark theme/i });
    darkButton.focus();
    await user.keyboard("{Enter}");

    expect(darkButton).toHaveAttribute("aria-pressed", "true");
    expect(window.localStorage.getItem("tenax.theme.preference")).toBe("dark");
  });
});
