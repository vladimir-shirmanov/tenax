import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { render } from "@testing-library/react";
import { HomeRoute } from "./home";
import { createTestQueryClient } from "../test/test-utils";
import { AppShell } from "../components/AppShell";
import { ThemeProvider } from "../app/theme";

const mockGetUser = jest.fn();
const mockSigninRedirect = jest.fn();
const mockSigninRedirectCallback = jest.fn();
const mockSignoutRedirect = jest.fn();
const mockSignoutRedirectCallback = jest.fn();

jest.mock("oidc-client-ts", () => {
  class WebStorageStateStore {
    constructor(_options?: unknown) {}
  }

  return {
    UserManager: jest.fn().mockImplementation(() => ({
      getUser: mockGetUser,
      signinRedirect: mockSigninRedirect,
      signinRedirectCallback: mockSigninRedirectCallback,
      signoutRedirect: mockSignoutRedirect,
      signoutRedirectCallback: mockSignoutRedirectCallback,
    })),
    WebStorageStateStore,
  };
});

describe("home route auth behavior", () => {
  const renderHomeRoute = (initialEntry: string) => {
    const queryClient = createTestQueryClient();
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <AppShell />,
          children: [
            { index: true, element: <HomeRoute /> },
            { path: "decks", element: <div>decks</div> },
            { path: "decks/:deckId/flashcards", element: <div>flashcards</div> },
          ],
        },
      ],
      { initialEntries: [initialEntry] }
    );

    return render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RouterProvider router={router} />
        </ThemeProvider>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    sessionStorage.clear();
    window.history.replaceState({}, "", "/");
    window.TENAX_AUTH_CONFIG = undefined;
    mockGetUser.mockResolvedValue(null);
    mockSigninRedirect.mockResolvedValue(undefined);
    mockSigninRedirectCallback.mockResolvedValue(null);
    mockSignoutRedirect.mockResolvedValue(undefined);
    mockSignoutRedirectCallback.mockResolvedValue(undefined);
  });

  it("renders anonymous homepage variant and starts oidc-client-ts redirect", async () => {
    window.TENAX_AUTH_CONFIG = {
      authority: "https://idp.example.com/realms/tenax",
      clientId: "tenax-web",
      redirectUri: "http://localhost/",
      postLogoutRedirectUri: "http://localhost/",
      defaultDeckId: "default",
    };

    const fetchMock = jest.spyOn(global, "fetch");

    renderHomeRoute("/");

    expect(await screen.findByRole("heading", { name: /welcome to tenax/i })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /learning menu/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSigninRedirect).toHaveBeenCalledWith(
        expect.objectContaining({
          state: expect.objectContaining({ returnTo: "/" }),
        })
      );
    });

    const calledUrls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(calledUrls.some((url) => url.includes("/api/auth/"))).toBe(false);
  });

  it("shows the approved missing-config error when runtime auth config is unavailable", async () => {
    renderHomeRoute("/");

    expect(await screen.findByRole("button", { name: /sign in/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByRole("alert", {
        name: "",
      })
    ).toHaveTextContent(/missing oidc authority, client id, or redirect uri\./i);
    expect(mockSigninRedirect).not.toHaveBeenCalled();
  });

  it("completes callback and restores return URL", async () => {
    window.TENAX_AUTH_CONFIG = {
      authority: "https://idp.example.com/realms/tenax",
      clientId: "tenax-web",
      redirectUri: "http://localhost/",
      postLogoutRedirectUri: "http://localhost/",
      defaultDeckId: "default",
    };

    const authenticatedUser = {
      access_token: "access-token",
      id_token: "id-token",
      token_type: "Bearer",
      scope: "openid profile email",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      expired: false,
      profile: {
        sub: "usr_1",
        name: "Vlada I",
        email: "vlada@example.com",
      },
      state: {
        returnTo: "/decks",
      },
    };

    mockSigninRedirectCallback.mockResolvedValue(authenticatedUser);
    mockGetUser.mockResolvedValue(authenticatedUser);
    window.history.replaceState({}, "", "/?code=test-code&state=test-state");

    renderHomeRoute("/?code=test-code&state=test-state");

    expect(await screen.findByText(/signed in as vlada i/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockSigninRedirectCallback).toHaveBeenCalledTimes(1);
      expect(window.location.pathname).toBe("/decks");
    });

    const storedSessionRaw = sessionStorage.getItem("tenax.auth.session.v1");
    expect(storedSessionRaw).toBeTruthy();
    expect(storedSessionRaw).toContain("access-token");
  });

  it("does not process sign-in callback when code is present without state", async () => {
    window.TENAX_AUTH_CONFIG = {
      authority: "https://idp.example.com/realms/tenax",
      clientId: "tenax-web",
      redirectUri: "http://localhost:19073/",
      postLogoutRedirectUri: "http://localhost:19073/",
      defaultDeckId: "default",
    };

    mockGetUser.mockResolvedValue(null);
    window.history.replaceState({}, "", "/?code=test-code");

    renderHomeRoute("/?code=test-code");

    expect(await screen.findByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByText(/unable to complete sign in callback\./i)).not.toBeInTheDocument();
    expect(mockSigninRedirectCallback).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("tenax.auth.session.v1")).toBeNull();
  });

  it("maps callback state mismatch to explicit contract error and clears session", async () => {
    window.TENAX_AUTH_CONFIG = {
      authority: "https://idp.example.com/realms/tenax",
      clientId: "tenax-web",
      redirectUri: "http://localhost:19073/",
      postLogoutRedirectUri: "http://localhost:19073/",
      defaultDeckId: "default",
    };

    sessionStorage.setItem(
      "tenax.auth.session.v1",
      JSON.stringify({
        accessToken: "stale-token",
        expiresAtEpochSeconds: Math.floor(Date.now() / 1000) + 120,
      })
    );

    mockSigninRedirectCallback.mockRejectedValue(new Error("No matching state found in storage"));
    mockGetUser.mockResolvedValue(null);
    window.history.replaceState({}, "", "/?code=test-code&state=test-state");

    renderHomeRoute("/?code=test-code&state=test-state");

    expect(
      await screen.findAllByText(
        /sign in callback state is missing, expired, or does not match the active browser session\./i
      )
    ).not.toHaveLength(0);
    expect(mockSigninRedirectCallback).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem("tenax.auth.session.v1")).toBeNull();
  });

  it("renders authenticated menu and logs out to anonymous state", async () => {
    window.TENAX_AUTH_CONFIG = {
      authority: "https://idp.example.com/realms/tenax",
      clientId: "tenax-web",
      redirectUri: "http://localhost/",
      postLogoutRedirectUri: "http://localhost/",
      defaultDeckId: "default",
    };

    mockGetUser
      .mockResolvedValueOnce({
        access_token: "access-token",
        id_token: "id-token",
        token_type: "Bearer",
        scope: "openid profile email",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expired: false,
        profile: {
          sub: "usr_1",
          name: "Vlada I",
          email: "vlada@example.com",
        },
      })
      .mockResolvedValueOnce(null);

    renderHomeRoute("/");

    expect(await screen.findByText(/signed in as vlada i/i)).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: /learning menu/i });
    expect(nav).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Decks" })).toHaveAttribute("href", "/decks");
    expect(within(nav).getByRole("link", { name: "Flashcards" })).toHaveAttribute("href", "/decks");

    await userEvent.click(screen.getByRole("button", { name: /sign out/i }));

    await waitFor(() => {
      expect(mockSignoutRedirect).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /learning menu/i })).not.toBeInTheDocument();
  });
});
