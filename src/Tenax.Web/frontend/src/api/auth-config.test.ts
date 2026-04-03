import { initializeRuntimeAuthConfig } from "./auth-config";

describe("runtime auth config bootstrap", () => {
  beforeEach(() => {
    window.TENAX_AUTH_CONFIG = undefined;
  });

  it("initializes window auth config from Vite env fallback with normalization and defaults", () => {
    const config = initializeRuntimeAuthConfig({
      VITE_TENAX_AUTH_AUTHORITY: " https://idp.example.com/realms/tenax/ ",
      VITE_TENAX_AUTH_CLIENT_ID: " tenax-spa ",
      VITE_TENAX_AUTH_REDIRECT_URI: " http://localhost:5173/ ",
      VITE_TENAX_AUTH_POST_LOGOUT_REDIRECT_URI: "   ",
      VITE_TENAX_AUTH_AUDIENCE: "   ",
      VITE_TENAX_AUTH_SCOPE: "   ",
      VITE_TENAX_AUTH_DEFAULT_DECK_ID: "   ",
    });

    expect(config).toEqual({
      authority: "https://idp.example.com/realms/tenax",
      clientId: "tenax-spa",
      redirectUri: "http://localhost:5173/",
      postLogoutRedirectUri: "http://localhost:5173/",
      defaultDeckId: "default",
      scope: "openid profile email",
    });
    expect(window.TENAX_AUTH_CONFIG).toEqual(config);
  });

  it("preserves an existing valid window config ahead of Vite env fallback", () => {
    window.TENAX_AUTH_CONFIG = {
      authority: " https://host.example.com/realms/tenax/ ",
      clientId: " hosted-client ",
      redirectUri: " https://app.example.com/callback ",
      postLogoutRedirectUri: " https://app.example.com/logout ",
      audience: " tenax-web-api ",
      defaultDeckId: " starter ",
      scope: " openid profile email offline_access ",
    };

    const config = initializeRuntimeAuthConfig({
      VITE_TENAX_AUTH_AUTHORITY: "https://idp.example.com/realms/tenax",
      VITE_TENAX_AUTH_CLIENT_ID: "tenax-spa",
      VITE_TENAX_AUTH_REDIRECT_URI: "http://localhost:5173/",
    });

    expect(config).toEqual({
      authority: "https://host.example.com/realms/tenax",
      clientId: "hosted-client",
      redirectUri: "https://app.example.com/callback",
      postLogoutRedirectUri: "https://app.example.com/logout",
      audience: "tenax-web-api",
      defaultDeckId: "starter",
      scope: "openid profile email offline_access",
    });
    expect(window.TENAX_AUTH_CONFIG).toEqual(config);
  });

  it("falls back to Vite env when the preexisting window config is incomplete", () => {
    window.TENAX_AUTH_CONFIG = {
      authority: "https://host.example.com/realms/tenax",
      clientId: "",
      redirectUri: "https://app.example.com/callback",
    };

    const config = initializeRuntimeAuthConfig({
      VITE_TENAX_AUTH_AUTHORITY: "https://idp.example.com/realms/tenax/",
      VITE_TENAX_AUTH_CLIENT_ID: "tenax-spa",
      VITE_TENAX_AUTH_REDIRECT_URI: "http://localhost:5173/",
      VITE_TENAX_AUTH_AUDIENCE: "tenax-web-api",
    });

    expect(config).toEqual({
      authority: "https://idp.example.com/realms/tenax",
      clientId: "tenax-spa",
      redirectUri: "http://localhost:5173/",
      postLogoutRedirectUri: "http://localhost:5173/",
      audience: "tenax-web-api",
      defaultDeckId: "default",
      scope: "openid profile email",
    });
    expect(window.TENAX_AUTH_CONFIG).toEqual(config);
  });

  it("derives redirect URIs from frontend origin when explicit redirect env is absent", () => {
    const config = initializeRuntimeAuthConfig({
      VITE_TENAX_AUTH_AUTHORITY: "https://idp.example.com/realms/tenax/",
      VITE_TENAX_AUTH_CLIENT_ID: "tenax-spa",
      VITE_TENAX_AUTH_FRONTEND_ORIGIN: " http://127.0.0.1:19073 ",
      VITE_TENAX_AUTH_AUDIENCE: "tenax-web-api",
    });

    expect(config).toEqual({
      authority: "https://idp.example.com/realms/tenax",
      clientId: "tenax-spa",
      redirectUri: "http://127.0.0.1:19073/",
      postLogoutRedirectUri: "http://127.0.0.1:19073/",
      audience: "tenax-web-api",
      defaultDeckId: "default",
      scope: "openid profile email",
    });
    expect(window.TENAX_AUTH_CONFIG).toEqual(config);
  });

  it("keeps auth runtime configuration compatible with silent renew", () => {
    const config = initializeRuntimeAuthConfig({
      VITE_TENAX_AUTH_AUTHORITY: "https://idp.example.com/realms/tenax/",
      VITE_TENAX_AUTH_CLIENT_ID: "tenax-spa",
      VITE_TENAX_AUTH_REDIRECT_URI: "http://localhost:5173/",
    });

    expect(config).toEqual(
      expect.objectContaining({
        authority: "https://idp.example.com/realms/tenax",
        clientId: "tenax-spa",
        redirectUri: "http://localhost:5173/",
      })
    );
  });
});
