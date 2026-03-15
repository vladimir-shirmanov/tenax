import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { User, UserManager, UserManagerSettings, WebStorageStateStore } from "oidc-client-ts";
import { ApiError } from "./errors";
import { AuthMenuLink, AuthSessionResponse, AuthSessionUser } from "./types";
import {
  clearAuthSession,
  persistAuthSession,
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

declare global {
  interface Window {
    TENAX_AUTH_CONFIG?: TenaxAuthConfig;
  }
}

const DEFAULT_SCOPE = "openid profile email";
const AUTH_LOG_PREFIX = "[auth.oidc]";

let authManager: UserManager | null = null;
let authManagerCacheKey: string | null = null;

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
    scope: config.scope ?? DEFAULT_SCOPE,
    defaultDeckId: config.defaultDeckId ?? "default",
  };
};

const toMenuLinks = (defaultDeckId: string): AuthMenuLink[] => [
  { key: "decks", label: "Decks", href: "/decks" },
  {
    key: "flashcards",
    label: "Flashcards",
    href: `/decks/${defaultDeckId}/flashcards`,
  },
];

const replaceBrowserUrl = (relativePath: string) => {
  if (typeof window === "undefined") {
    return;
  }

  window.history.replaceState({}, "", relativePath);
};

const toAuthError = (code: string, message: string, status = 500) =>
  new ApiError(status, { code, message });

const logAuthError = (tag: string, error: unknown) => {
  console.error(`${AUTH_LOG_PREFIX}.${tag}`, error);
};

const createManagerSettings = (config: TenaxAuthConfig): UserManagerSettings => ({
  authority: config.authority,
  client_id: config.clientId,
  redirect_uri: config.redirectUri,
  post_logout_redirect_uri: config.postLogoutRedirectUri ?? config.redirectUri,
  response_type: "code",
  scope: config.scope ?? DEFAULT_SCOPE,
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  extraQueryParams: config.audience ? { audience: config.audience } : undefined,
});

const getManagerCacheKey = (config: TenaxAuthConfig) =>
  JSON.stringify({
    authority: config.authority,
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    postLogoutRedirectUri: config.postLogoutRedirectUri,
    scope: config.scope,
    audience: config.audience,
  });

const getUserManager = (requireConfig: boolean): UserManager | null => {
  const config = readAuthConfig();
  if (!config) {
    if (requireConfig) {
      throw toAuthError(
        "oidc_configuration_invalid",
        "Missing OIDC authority, client id, or redirect URI."
      );
    }

    return null;
  }

  const cacheKey = getManagerCacheKey(config);
  if (authManager && authManagerCacheKey === cacheKey) {
    return authManager;
  }

  authManager = new UserManager(createManagerSettings(config));
  authManagerCacheKey = cacheKey;
  return authManager;
};

const toAuthSessionUser = (user: User): AuthSessionUser | null => {
  const subject = user.profile?.sub;
  if (!subject) {
    return null;
  }

  return {
    subject,
    displayName:
      user.profile?.name ?? user.profile?.preferred_username ?? user.profile?.email ?? subject,
    email: user.profile?.email ?? null,
  };
};

const syncStorageFromUser = (user: User | null) => {
  if (!user || user.expired || !user.access_token) {
    clearAuthSession();
    return;
  }

  persistAuthSession({
    accessToken: user.access_token,
    idToken: user.id_token,
    tokenType: user.token_type,
    scope: user.scope,
    expiresAtEpochSeconds:
      typeof user.expires_at === "number" && Number.isFinite(user.expires_at)
        ? user.expires_at
        : Math.floor(Date.now() / 1000) + 60,
  });
};

const readReturnTo = (state: unknown): string => {
  if (!state || typeof state !== "object") {
    return "/";
  }

  const value = (state as { returnTo?: unknown }).returnTo;
  return typeof value === "string" && value.length > 0 ? value : "/";
};

const hasSignInCallbackParams = (query: URLSearchParams) =>
  query.has("code") || query.has("error");

const hasSignOutCallbackParams = (query: URLSearchParams) =>
  query.has("state") && !query.has("code") && !query.has("error");

const resolveCallbackIfPresent = async () => {
  if (typeof window === "undefined") {
    return;
  }

  const query = new URLSearchParams(window.location.search);
  if (!hasSignInCallbackParams(query) && !hasSignOutCallbackParams(query)) {
    return;
  }

  const manager = getUserManager(true);
  if (!manager) {
    return;
  }

  if (hasSignInCallbackParams(query)) {
    try {
      const user = await manager.signinRedirectCallback();
      syncStorageFromUser(user);
      replaceBrowserUrl(readReturnTo(user?.state));
      return;
    } catch (error) {
      clearAuthSession();
      logAuthError("callback", error);
      throw toAuthError("oidc_callback_invalid", "Unable to complete sign in callback.", 400);
    }
  }

  if (hasSignOutCallbackParams(query)) {
    try {
      const signOutResponse = await manager.signoutRedirectCallback();
      const returnTo = readReturnTo(signOutResponse?.state);
      replaceBrowserUrl(returnTo);
    } catch (error) {
      logAuthError("logout_callback", error);
      replaceBrowserUrl("/");
    }
  }
};

type LoginStartParams = {
  returnTo?: string;
};

const startLogin = async (returnTo: string) => {
  const manager = getUserManager(true);
  if (!manager) {
    throw toAuthError(
      "oidc_configuration_invalid",
      "Missing OIDC authority, client id, or redirect URI."
    );
  }

  try {
    await manager.signinRedirect({ state: { returnTo } });
  } catch (error) {
    logAuthError("login_start", error);
    throw toAuthError("oidc_redirect_start_failed", "Unable to start sign in. Please try again.");
  }
};

const startLogout = async () => {
  clearAuthSession();

  const config = readAuthConfig();
  if (!config) {
    return;
  }

  const manager = getUserManager(true);
  const postLogoutRedirectUri = config.postLogoutRedirectUri ?? config.redirectUri;
  try {
    if (manager) {
      await manager.signoutRedirect({
        post_logout_redirect_uri: postLogoutRedirectUri,
        state: { returnTo: "/" },
      });
    }
  } catch (error) {
    logAuthError("logout_start", error);

    if (window.location.href !== postLogoutRedirectUri) {
      window.location.assign(postLogoutRedirectUri);
    }

    throw toAuthError("logout_not_possible", "Unable to start sign out redirect.", 409);
  }
};

const readClientSession = async (): Promise<AuthSessionResponse> => {
  const manager = getUserManager(false);
  if (!manager) {
    return toAnonymousSession();
  }

  try {
    const config = readAuthConfig();
    const currentUser = await manager.getUser();
    syncStorageFromUser(currentUser);

    if (!currentUser || currentUser.expired || !currentUser.access_token) {
      return toAnonymousSession();
    }

    const user = toAuthSessionUser(currentUser);
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
  } catch (error) {
    logAuthError("session", error);
    throw toAuthError("session_read_failed", "Unable to read authentication session.");
  }
};

export const useAuthSessionQuery = () =>
  useQuery({
    queryKey: authKeys.session,
    queryFn: async () => {
      await resolveCallbackIfPresent();
      return readClientSession();
    },
    staleTime: 0,
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

export const useLoginStartMutation = () =>
  useMutation({
    mutationFn: ({ returnTo }: LoginStartParams) => {
      const fallbackReturnTo =
        typeof window === "undefined"
          ? "/"
          : `${window.location.pathname}${window.location.search}${window.location.hash}`;

      return startLogin(returnTo ?? fallbackReturnTo);
    },
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
