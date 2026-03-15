import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HomeRoute } from "./home";
import { renderRoute } from "../test/test-utils";

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

    renderRoute("/", <HomeRoute />, "/");

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

    renderRoute("/", <HomeRoute />, "/");

    expect(await screen.findByText(/signed in as vlada i/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockSigninRedirectCallback).toHaveBeenCalledTimes(1);
      expect(window.location.pathname).toBe("/decks");
    });

    const storedSessionRaw = sessionStorage.getItem("tenax.auth.session.v1");
    expect(storedSessionRaw).toBeTruthy();
    expect(storedSessionRaw).toContain("access-token");
  });

  it("renders explicit callback error when callback processing fails", async () => {
    window.TENAX_AUTH_CONFIG = {
      authority: "https://idp.example.com/realms/tenax",
      clientId: "tenax-web",
      redirectUri: "http://localhost/",
      postLogoutRedirectUri: "http://localhost/",
      defaultDeckId: "default",
    };

    mockSigninRedirectCallback.mockRejectedValue(new Error("state mismatch"));
    mockGetUser.mockResolvedValue(null);
    window.history.replaceState({}, "", "/?code=test-code&state=test-state");

    renderRoute("/", <HomeRoute />, "/");

    expect(
      await screen.findByText(/unable to complete sign in callback\./i)
    ).toBeInTheDocument();
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

    renderRoute("/", <HomeRoute />, "/");

    expect(await screen.findByText(/signed in as vlada i/i)).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: /learning menu/i });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Decks" })).toHaveAttribute("href", "/decks");
    expect(screen.getByRole("link", { name: "Flashcards" })).toHaveAttribute(
      "href",
      "/decks/default/flashcards"
    );

    await userEvent.click(screen.getByRole("button", { name: /sign out/i }));

    await waitFor(() => {
      expect(mockSignoutRedirect).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /learning menu/i })).not.toBeInTheDocument();
  });
});
