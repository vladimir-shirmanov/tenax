import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthMenuLink, AuthSessionResponse, AuthSessionUser } from "./types";
import {
  clearAuthSession,
  persistAuthSession,
  readActiveAccessToken,
  readAuthSession,
} from "./auth-storage";

type TenaxAuthConfig = {
  authority: string;
  clientId: string;
  redirectUri: string;
  postLogoutRedirectUri?: string;
  scope?: string;
  audience?: string;
  defaultDeckId?: string;
};

type OidcDiscoveryDocument = {
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint?: string;
};

type PendingPkceTransaction = {
  state: string;
  nonce: string;
  codeVerifier: string;
  createdAtUnixMilliseconds: number;
  returnTo: string;
};

declare global {
  interface Window {
    TENAX_AUTH_CONFIG?: TenaxAuthConfig;
    TENAX_LAST_REDIRECT_URL?: string;
  }
}

const PKCE_TRANSACTION_STORAGE_KEY = "tenax.auth.pkce.transaction.v1";

const toAnonymousSession = (): AuthSessionResponse => ({
  isAuthenticated: false,
  user: null,
  menu: {
    visible: false,
    links: [],
  },
});

export const authKeys = {
  session: ["auth", "clientSession"] as const,
};

const normalizeAuthority = (authority: string) => authority.replace(/\/$/, "");

const readAuthConfig = (): TenaxAuthConfig | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const config = window.TENAX_AUTH_CONFIG;
  if (!config || !config.authority || !config.clientId || !config.redirectUri) {
    return null;
  }

  return {
    ...config,
    authority: normalizeAuthority(config.authority),
    scope: config.scope ?? "openid profile email",
    defaultDeckId: config.defaultDeckId ?? "default",
  };
};

const persistPendingTransaction = (value: PendingPkceTransaction) => {
  sessionStorage.setItem(PKCE_TRANSACTION_STORAGE_KEY, JSON.stringify(value));
};

const readPendingTransaction = (): PendingPkceTransaction | null => {
  const raw = sessionStorage.getItem(PKCE_TRANSACTION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const candidate = parsed as PendingPkceTransaction;
    if (
      typeof candidate.state !== "string" ||
      typeof candidate.nonce !== "string" ||
      typeof candidate.codeVerifier !== "string" ||
      typeof candidate.returnTo !== "string" ||
      typeof candidate.createdAtUnixMilliseconds !== "number"
    ) {
      return null;
    }

    return candidate;
  } catch {
    return null;
  }
};

const clearPendingTransaction = () => {
  sessionStorage.removeItem(PKCE_TRANSACTION_STORAGE_KEY);
};

const decodeBase64UrlToString = (value: string): string => {
  const withPadding = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  const base64 = withPadding.replace(/-/g, "+").replace(/_/g, "/");

  if (typeof atob === "function") {
    return atob(base64);
  }

  return Buffer.from(base64, "base64").toString("utf8");
};

const readUserFromToken = (token: string): AuthSessionUser | null => {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64UrlToString(parts[1])) as {
      sub?: string;
      email?: string;
      preferred_username?: string;
      name?: string;
    };

    if (!payload.sub) {
      return null;
    }

    return {
      subject: payload.sub,
      displayName: payload.name ?? payload.preferred_username ?? payload.sub,
      email: payload.email ?? null,
    };
  } catch {
    return null;
  }
};

const toMenuLinks = (defaultDeckId: string): AuthMenuLink[] => [
  { key: "decks", label: "Decks", href: "/decks" },
  {
    key: "flashcards",
    label: "Flashcards",
    href: `/decks/${defaultDeckId}/flashcards`,
  },
];

const readClientSession = (): AuthSessionResponse => {
  const config = readAuthConfig();
  const accessToken = readActiveAccessToken();
  if (!accessToken) {
    return toAnonymousSession();
  }

  const user = readUserFromToken(accessToken);
  if (!user) {
    clearAuthSession();
    return toAnonymousSession();
  }

  return {
    isAuthenticated: true,
    user,
    menu: {
      visible: true,
      links: toMenuLinks(config?.defaultDeckId ?? "default"),
    },
  };
};

const toBase64Url = (bytes: Uint8Array): string => {
  const binary = String.fromCharCode(...bytes);
  const base64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(binary, "binary").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const createRandomString = (byteLength: number): string => {
  const bytes = new Uint8Array(byteLength);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < byteLength; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  return toBase64Url(bytes);
};

const createPkceChallenge = async (
  verifier: string
): Promise<{ challenge: string; method: "S256" | "plain" }> => {
  if (globalThis.crypto?.subtle) {
    try {
      const encoded = new TextEncoder().encode(verifier);
      const digest = await globalThis.crypto.subtle.digest("SHA-256", encoded);
      return { challenge: toBase64Url(new Uint8Array(digest)), method: "S256" };
    } catch {
      // Fall back to plain verifier when subtle crypto is unavailable.
    }
  }

  return { challenge: verifier, method: "plain" };
};

const fetchDiscoveryDocument = async (
  authority: string
): Promise<OidcDiscoveryDocument> => {
  const response = await fetch(`${authority}/.well-known/openid-configuration`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load OIDC discovery metadata.");
  }

  const payload = (await response.json()) as Partial<OidcDiscoveryDocument>;
  if (!payload.authorization_endpoint || !payload.token_endpoint) {
    throw new Error("OIDC discovery metadata is incomplete.");
  }

  return {
    authorization_endpoint: payload.authorization_endpoint,
    token_endpoint: payload.token_endpoint,
    end_session_endpoint: payload.end_session_endpoint,
  };
};

const replaceBrowserUrl = (relativePath: string) => {
  if (typeof window === "undefined") {
    return;
  }

  window.history.replaceState({}, "", relativePath);
};

const resolveCallbackIfPresent = async () => {
  if (typeof window === "undefined") {
    return;
  }

  const config = readAuthConfig();
  const query = new URLSearchParams(window.location.search);
  const hasOidcCallbackParams = query.has("code") || query.has("state") || query.has("error");
  if (!hasOidcCallbackParams) {
    return;
  }

  const tx = readPendingTransaction();
  const fallbackReturnTo = tx?.returnTo ?? "/";

  if (query.has("error")) {
    clearPendingTransaction();
    clearAuthSession();
    replaceBrowserUrl(fallbackReturnTo);
    return;
  }

  if (!config || !tx) {
    clearPendingTransaction();
    clearAuthSession();
    replaceBrowserUrl(fallbackReturnTo);
    return;
  }

  const code = query.get("code");
  const returnedState = query.get("state");
  if (!code || !returnedState || returnedState !== tx.state) {
    clearPendingTransaction();
    clearAuthSession();
    replaceBrowserUrl(fallbackReturnTo);
    return;
  }

  const discovery = await fetchDiscoveryDocument(config.authority);

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    code_verifier: tx.codeVerifier,
  });

  if (config.audience) {
    body.set("audience", config.audience);
  }

  const tokenResponse = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!tokenResponse.ok) {
    clearPendingTransaction();
    clearAuthSession();
    replaceBrowserUrl(fallbackReturnTo);
    throw new Error("OIDC code exchange failed.");
  }

  const tokenPayload = (await tokenResponse.json()) as {
    access_token?: string;
    id_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };

  if (!tokenPayload.access_token || !tokenPayload.expires_in) {
    clearPendingTransaction();
    clearAuthSession();
    replaceBrowserUrl(fallbackReturnTo);
    throw new Error("OIDC token response is missing required fields.");
  }

  const expiresAtEpochSeconds = Math.floor(Date.now() / 1000) + tokenPayload.expires_in;
  persistAuthSession({
    accessToken: tokenPayload.access_token,
    idToken: tokenPayload.id_token,
    tokenType: tokenPayload.token_type,
    scope: tokenPayload.scope,
    expiresAtEpochSeconds,
  });

  clearPendingTransaction();
  replaceBrowserUrl(tx.returnTo || "/");
};

export const redirectTo = (url: string) => {
  // Keep test-observable redirect state even when navigation is blocked in jsdom.
  window.TENAX_LAST_REDIRECT_URL = url;

  try {
    window.location.assign(url);
  } catch {
    // Ignore navigation errors; callers only need redirect intent recorded.
  }
};

type LoginStartParams = {
  returnTo?: string;
};

const startLogin = async (returnTo: string) => {
  const config = readAuthConfig();
  if (!config) {
    throw new Error("OIDC configuration is missing.");
  }

  const discovery = await fetchDiscoveryDocument(config.authority);

  const state = createRandomString(24);
  const nonce = createRandomString(24);
  const codeVerifier = createRandomString(64);
  const pkce = await createPkceChallenge(codeVerifier);

  persistPendingTransaction({
    state,
    nonce,
    codeVerifier,
    createdAtUnixMilliseconds: Date.now(),
    returnTo,
  });

  const authUrl = new URL(discovery.authorization_endpoint);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", config.redirectUri);
  authUrl.searchParams.set("scope", config.scope ?? "openid profile email");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("nonce", nonce);
  authUrl.searchParams.set("code_challenge", pkce.challenge);
  authUrl.searchParams.set("code_challenge_method", pkce.method);

  if (config.audience) {
    authUrl.searchParams.set("audience", config.audience);
  }

  redirectTo(authUrl.toString());
};

const startLogout = async () => {
  const config = readAuthConfig();
  const current = readAuthSession();

  clearPendingTransaction();
  clearAuthSession();

  if (!config) {
    return;
  }

  const postLogoutRedirectUri = config.postLogoutRedirectUri ?? config.redirectUri;

  try {
    const discovery = await fetchDiscoveryDocument(config.authority);

    if (discovery.end_session_endpoint && current?.idToken) {
      const logoutState = createRandomString(16);
      const logoutUrl = new URL(discovery.end_session_endpoint);
      logoutUrl.searchParams.set("id_token_hint", current.idToken);
      logoutUrl.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri);
      logoutUrl.searchParams.set("state", logoutState);
      redirectTo(logoutUrl.toString());
      return;
    }
  } catch {
    // Local logout remains valid when IdP metadata is unavailable.
  }

  if (window.location.href !== postLogoutRedirectUri) {
    redirectTo(postLogoutRedirectUri);
  }
};

export const useAuthSessionQuery = () =>
  useQuery({
    queryKey: authKeys.session,
    queryFn: async () => {
      await resolveCallbackIfPresent();
      return readClientSession();
    },
    staleTime: 5_000,
    retry: false,
    refetchOnWindowFocus: true,
  });

export const useLoginStartMutation = () =>
  useMutation({
    mutationFn: ({ returnTo }: LoginStartParams) => startLogin(returnTo ?? window.location.pathname),
  });

export const useLogoutMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => startLogout(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: authKeys.session });
      const previous = queryClient.getQueryData<AuthSessionResponse>(authKeys.session);
      queryClient.setQueryData<AuthSessionResponse>(authKeys.session, toAnonymousSession());

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData<AuthSessionResponse>(authKeys.session, context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.session });
    },
  });
};
