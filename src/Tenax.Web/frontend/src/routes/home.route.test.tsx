import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HomeRoute } from "./home";
import { renderRoute } from "../test/test-utils";
import { persistAuthSession } from "../api/auth-storage";

const jsonResponse = (status: number, body: unknown) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response);

describe("home route auth behavior", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    sessionStorage.clear();
    window.history.replaceState({}, "", "/");
    window.TENAX_AUTH_CONFIG = undefined;
    window.TENAX_LAST_REDIRECT_URL = undefined;
  });

  it("renders anonymous homepage variant and starts frontend PKCE login redirect", async () => {
    window.TENAX_AUTH_CONFIG = {
      authority: "https://idp.example.com/realms/tenax",
      clientId: "tenax-web",
      redirectUri: "http://localhost/",
      postLogoutRedirectUri: "http://localhost/",
      defaultDeckId: "default",
    };

    const fetchMock = jest.spyOn(global, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (
        url ===
          "https://idp.example.com/realms/tenax/.well-known/openid-configuration" &&
        (!init?.method || init.method === "GET")
      ) {
        return jsonResponse(200, {
          authorization_endpoint:
            "https://idp.example.com/realms/tenax/protocol/openid-connect/auth",
          token_endpoint:
            "https://idp.example.com/realms/tenax/protocol/openid-connect/token",
          end_session_endpoint:
            "https://idp.example.com/realms/tenax/protocol/openid-connect/logout",
        });
      }

      return jsonResponse(404, { code: "not_found", message: "not found" });
    });

    renderRoute("/", <HomeRoute />, "/");

    expect(await screen.findByRole("heading", { name: /welcome to tenax/i })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /learning menu/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "https://idp.example.com/realms/tenax/.well-known/openid-configuration",
        expect.objectContaining({ method: "GET" })
      );
      const pendingTxRaw = sessionStorage.getItem("tenax.auth.pkce.transaction.v1");
      expect(pendingTxRaw).toBeTruthy();
      expect(decodeURIComponent(window.TENAX_LAST_REDIRECT_URL ?? "")).toContain(
        "https://idp.example.com/realms/tenax/protocol/openid-connect/auth"
      );
      expect(decodeURIComponent(window.TENAX_LAST_REDIRECT_URL ?? "")).toContain(
        "response_type=code"
      );
      const redirectUrl = decodeURIComponent(window.TENAX_LAST_REDIRECT_URL ?? "");
      expect(
        redirectUrl.includes("code_challenge_method=S256") ||
          redirectUrl.includes("code_challenge_method=plain")
      ).toBe(true);
      expect(decodeURIComponent(window.TENAX_LAST_REDIRECT_URL ?? "")).toContain(
        "client_id=tenax-web"
      );
    });

    const calledUrls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(calledUrls.some((url) => url.includes("/api/auth/"))).toBe(false);
  });

  it("renders authenticated menu and logs out to anonymous state", async () => {
    const farFuture = Math.floor(Date.now() / 1000) + 3600;
    persistAuthSession({
      accessToken:
        "header.eyJzdWIiOiJ1c3JfMSIsIm5hbWUiOiJWbGFkYSBJIiwiZW1haWwiOiJ2bGFkYUBleGFtcGxlLmNvbSIsImV4cCI6OTk5OTk5OTk5OX0.signature",
      expiresAtEpochSeconds: farFuture,
    });

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

    expect(await screen.findByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /learning menu/i })).not.toBeInTheDocument();
  });
});
